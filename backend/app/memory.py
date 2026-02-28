from contextvars import ContextVar


_request_memory: ContextVar[list[dict]] = ContextVar("request_memory", default=[])


def add_message(role: str, content: str):
    current = list(_request_memory.get())
    current.append({
        "role": role,
        "content": content,
    })
    _request_memory.set(current[-6:])


def get_memory():
    return list(_request_memory.get())[-6:]


def clear_memory():
    _request_memory.set([])
