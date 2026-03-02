# Клари — CRM-аналитика для CEO агентства недвижимости

Прототип продукта по PRD. Показывает CEO, где именно система теряет деньги.

## Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.11+ + FastAPI + SQLite |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |

## Запуск

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

API будет доступен на http://localhost:8000
Swagger документация: http://localhost:8000/docs

### 2. Frontend

Нужен Node.js ≥ 18. Если не установлен — через Homebrew:
```bash
brew install node
```

```bash
cd frontend
npm install
npm run dev
```

Откроется на http://localhost:5173

---

## Что реализовано

| Экран | PRD | Статус |
|---|---|---|
| Дашборд (воронка + деньги + план/факт) | v1 MUST | ✅ |
| Разрез по этапам с упущенной выручкой | v2 SHOULD | ✅ |
| Проблемные сделки (под риском) | v3 SHOULD | ✅ |
| Разрез по каналам | v4 LATER | ✅ |
| Разрез по менеджерам | v5 LATER | ✅ |

## Данные

База создаётся автоматически при первом запуске бэкенда (`clari.db`).
430 сделок за 6 месяцев с реалистичными параметрами:
- 6 менеджеров с разным перформансом
- 5 каналов (Циан, Авито, Контекст, Соцсети, Рефералы)
- Воронка: Заявка → Контакт → Показ → Бронь → Ипотека → Сделка
- ~38% активных сделок «протухшие» (нет активности > 7 дней)

## API endpoints

```
GET /api/dashboard?period=month|quarter|all
GET /api/stages?period=month|quarter|all
GET /api/deals/problems?min_days_stale=7&manager_id=&stage=&channel=&sort_by=amount
GET /api/deals?status=&stage=&manager_id=
GET /api/deals/managers?period=month|quarter|all
GET /api/deals/channels?period=month|quarter|all
GET /api/meta/managers
GET /api/meta/channels
```

## Следующие шаги (для продакшена)

1. **Интеграция с amoCRM / Битрикс24** — читать сделки через API (read-only)
2. **Auth** — JWT или OAuth для входа
3. **БД** → PostgreSQL для продакшена
4. **Фильтр периода на воронке** — сейчас воронка показывает текущий снимок пайплайна
5. **Drill-down** — клик по этапу → список сделок этого этапа
