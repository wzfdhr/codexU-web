# -*- coding: utf-8 -*-
"""探查 .codex 下 sqlite 数据结构（只读，临时排查用）"""
import sqlite3
import os
import sys

home = os.environ.get('USERPROFILE', os.path.expanduser('~'))

def inspect(dbname):
    p = os.path.join(home, '.codex', dbname)
    print('===', dbname, '===')
    try:
        c = sqlite3.connect('file:%s?mode=ro' % p.replace(os.sep, '/'), uri=True)
    except Exception as e:
        print('  open err:', e)
        return
    try:
        tables = c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        for (t,) in tables:
            cols = c.execute('PRAGMA table_info(%s)' % t).fetchall()
            try:
                n = c.execute('SELECT COUNT(*) FROM %s' % t).fetchone()[0]
            except Exception:
                n = '?'
            print('  %s rows=%s' % (t, n))
            print('    cols:', [x[1] for x in cols])
        c.close()
    except Exception as e:
        print('  err:', e)

for db in ['state_5.sqlite', 'logs_2.sqlite']:
    inspect(db)

# threads 样例：确认 tokens_used 是不是累计值
print()
print('=== state_5.threads 最近 5 行样例 ===')
p = os.path.join(home, '.codex', 'state_5.sqlite')
c = sqlite3.connect('file:%s?mode=ro' % p.replace(os.sep, '/'), uri=True)
try:
    cols = [x[1] for x in c.execute('PRAGMA table_info(threads)').fetchall()]
    print('threads cols:', cols)
    rows = c.execute('SELECT * FROM threads ORDER BY updated_at DESC LIMIT 5').fetchall()
    for r in rows:
        print(dict(zip(cols, r)))
except Exception as e:
    print('err:', e)
c.close()
