from functools import wraps
from fastapi import Depends
from app.core.enums import UserRole
from app.core.exceptions import ForbiddenError


def require_role(*roles: UserRole):
    from app.dependencies import get_current_user

    async def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise ForbiddenError(f"Requires role: {', '.join(r.value for r in roles)}")
        return current_user

    return role_checker
