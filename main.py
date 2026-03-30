from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from kid_quest.db import ensure_indexes
from kid_quest.service import (
    get_dashboard_stats,
    get_kid_overview,
    get_kid_profile,
    kid_exists,
    log_reading_session,
    save_math_game,
)
from kid_quest.math_utils import generate_math_questions


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_indexes()
    yield


app = FastAPI(title="Kid Quest", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.get("/api/kids")
def list_kids():
    try:
        return {"kids": get_kid_overview()}
    except Exception as error:
        return JSONResponse(
            {"error": str(error) or "Unable to load kids."},
            status_code=500,
        )


@app.get("/api/kids/{kid_id}")
def fetch_kid(kid_id: str):
    try:
        kid = get_kid_profile(kid_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {"kid": kid}


@app.post("/api/kids/{kid_id}/reading-sessions")
async def create_reading_session(kid_id: str, request: Request):
    try:
        payload = await request.json()
        log_reading_session(kid_id, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return JSONResponse({"success": True}, status_code=201)


@app.get("/api/kids/{kid_id}/math-questions")
def create_math_questions(kid_id: str):
    try:
        if not kid_exists(kid_id):
            raise LookupError("Kid not found.")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {"questions": generate_math_questions(10)}


@app.post("/api/kids/{kid_id}/math-games")
async def create_math_game(kid_id: str, request: Request):
    try:
        payload = await request.json()
        game = save_math_game(kid_id, payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return JSONResponse({"success": True, "game": game}, status_code=201)


@app.get("/api/kids/{kid_id}/dashboard")
def fetch_dashboard(kid_id: str):
    try:
        stats = get_dashboard_stats(kid_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error

    return {"stats": stats}
