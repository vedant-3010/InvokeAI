import sqlite3
import threading

from invokeai.app.invocations.baseinvocation import WorkflowField, WorkflowFieldValidator
from invokeai.app.services.invoker import Invoker
from invokeai.app.services.shared.sqlite import SqliteDatabase
from invokeai.app.services.workflow_records.workflow_records_base import WorkflowRecordsStorageBase
from invokeai.app.services.workflow_records.workflow_records_common import WorkflowNotFoundError
from invokeai.app.util.misc import uuid_string


class SqliteWorkflowRecordsStorage(WorkflowRecordsStorageBase):
    _invoker: Invoker
    _conn: sqlite3.Connection
    _cursor: sqlite3.Cursor
    _lock: threading.RLock

    def __init__(self, db: SqliteDatabase) -> None:
        super().__init__()
        self._lock = db.lock
        self._conn = db.conn
        self._cursor = self._conn.cursor()
        self._create_tables()

    def start(self, invoker: Invoker) -> None:
        self._invoker = invoker

    def get(self, workflow_id: str) -> WorkflowField:
        try:
            self._lock.acquire()
            self._cursor.execute(
                """--sql
                SELECT workflow
                FROM workflows
                WHERE workflow_id = ?;
                """,
                (workflow_id,),
            )
            row = self._cursor.fetchone()
            if row is None:
                raise WorkflowNotFoundError(f"Workflow with id {workflow_id} not found")
            return WorkflowFieldValidator.validate_json(row[0])
        except Exception:
            self._conn.rollback()
            raise
        finally:
            self._lock.release()

    def create(self, workflow: WorkflowField) -> WorkflowField:
        try:
            # workflows do not have ids until they are saved
            workflow_id = uuid_string()
            workflow.root["id"] = workflow_id
            self._lock.acquire()
            self._cursor.execute(
                """--sql
                INSERT INTO workflows(workflow)
                VALUES (?);
                """,
                (workflow.json(),),
            )
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise
        finally:
            self._lock.release()
        return self.get(workflow_id)

    def _create_tables(self) -> None:
        try:
            self._lock.acquire()
            self._cursor.execute(
                """--sql
                CREATE TABLE IF NOT EXISTS workflows (
                    workflow TEXT NOT NULL,
                    workflow_id TEXT GENERATED ALWAYS AS (json_extract(workflow, '$.id')) VIRTUAL NOT NULL UNIQUE, -- gets implicit index
                    created_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
                    updated_at DATETIME NOT NULL DEFAULT(STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')) -- updated via trigger
                );
                """
            )

            self._cursor.execute(
                """--sql
                CREATE TRIGGER IF NOT EXISTS tg_workflows_updated_at
                AFTER UPDATE
                ON workflows FOR EACH ROW
                BEGIN
                    UPDATE workflows
                    SET updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
                    WHERE workflow_id = old.workflow_id;
                END;
                """
            )

            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise
        finally:
            self._lock.release()
