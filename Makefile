.PHONY: help up seed train test lint clean

help:
	@echo "Leftover Radar Commands:"
	@echo "  make up       - Start backend server and verify database"
	@echo "  make seed     - Run simulator and seed MongoDB"
	@echo "  make train    - Run ML feature build, CV, and training"
	@echo "  make test     - Run backend and unit tests"
	@echo "  make lint     - Run ruff code linter"

up:
	python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

seed:
	python scripts/seed_database.py

train:
	python -m backend.ml.train --seed 42

test:
	python -m pytest backend/tests -v

lint:
	python -m ruff check backend scripts

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
