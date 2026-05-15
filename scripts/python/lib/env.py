import os
import re

def strip_quotes(value):
    if value is None:
        return ''
    return re.sub(r'^["\']|["\']$', '', str(value)).strip()

def read_env_file_value(file_path, key):
    if not os.path.exists(file_path):
        return None

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            for line in content.splitlines():
                match = re.match(rf'^\s*{key}\s*=\s*(.+?)\s*$', line)
                if match:
                    return strip_quotes(match.group(1))
    except Exception:
        pass

    return None

def load_env_value(key, skill_root):
    file_path = os.path.join(skill_root, '.env')
    from_file = read_env_file_value(file_path, key)
    if from_file is not None and from_file != '':
        return from_file

    return os.environ.get(key)
