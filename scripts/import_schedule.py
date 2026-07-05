import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Загружаем переменные окружения из .env (лучше не хранить пароль в коде)
load_dotenv()

# Подключение к Supabase (используйте Connection String из Settings -> Database)
# Пример: postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
SUPABASE_CONN = os.getenv("SUPABASE_DB_URL")
if not SUPABASE_CONN:
    raise ValueError("Переменная окружения SUPABASE_DB_URL не задана")

engine = create_engine(SUPABASE_CONN)

def process_xlsx(file_path: str):
    print(f"Обработка: {file_path}")
    df = pd.read_excel(file_path, engine='openpyxl', dtype=str)
    df = df.dropna(how='all')  # удаляем полностью пустые строки

    for idx, row in df.iterrows():
        # Преобразуем строку в словарь, заменяя NaN на None
        row_dict = row.where(pd.notnull(row), None).to_dict()
        # Очищаем ключи: убираем лишние пробелы, заменяем внутренние пробелы на _
        clean_dict = {}
        for k, v in row_dict.items():
            if isinstance(k, str):
                clean_key = k.strip().replace(' ', '_')
            else:
                clean_key = str(k)
            clean_dict[clean_key] = v
        
        # Вставляем в raw_schedule_import
        with engine.connect() as conn:
            conn.execute(
                text("INSERT INTO raw_schedule_import (row_data) VALUES (:data)"),
                {"data": json.dumps(clean_dict, ensure_ascii=False)}
            )
            conn.commit()
    print(f"Импортировано строк: {len(df)}")

def main():
    xlsx_dir = "./xlsx_files"
    if not os.path.exists(xlsx_dir):
        os.makedirs(xlsx_dir)
        print(f"Создана папка {xlsx_dir}. Поместите туда XLSX-файлы и запустите скрипт снова.")
        return
    
    for filename in os.listdir(xlsx_dir):
        if filename.endswith((".xlsx", ".xls")):
            process_xlsx(os.path.join(xlsx_dir, filename))

if __name__ == "__main__":
    main()