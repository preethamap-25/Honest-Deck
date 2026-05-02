#!/usr/bin/env python3
"""
Usage: python scripts/hash_password.py yourpassword

Paste the output into .env as ADMIN_PASSWORD_HASH=...
"""
import sys
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

if len(sys.argv) < 2:
    print("Usage: python scripts/hash_password.py <your-password>")
    sys.exit(1)

password = sys.argv[1]
hashed = pwd_context.hash(password)
print(f"\nADMIN_PASSWORD_HASH={hashed}\n")
print("Paste the line above into your .env file.")
