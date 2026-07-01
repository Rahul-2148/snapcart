import io
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from PIL import Image
from models.vision_engine import VisionEngine

router = APIRouter(prefix="/vision", tags=["vision"])

_vision_engine = None

def get_vision_engine() -> VisionEngine:
    global _vision_engine
    if _vision_engine is None:
        print("Lazy loading Vision Engine (YOLO + DINOv2)...")
        _vision_engine = VisionEngine()
    return _vision_engine

class IndexItem(BaseModel):
    id: str
    image_url: str

class IndexRequest(BaseModel):
    variants: List[IndexItem]

class UpdateRequest(BaseModel):
    id: str
    image_url: str

@router.post("/search")
async def vision_search(file: UploadFile = File(...), k: int = Form(5)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    
    try:
        file_bytes = await file.read()
        pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        
        matches = get_vision_engine().search(pil_image, k=k)
        return {
            "success": True,
            "matches": matches
        }
    except Exception as e:
        print(f"Error during vision search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/index")
async def vision_index(payload: IndexRequest):
    try:
        success_count = 0
        errors = []
        
        for item in payload.variants:
            try:
                # Add to index (downloads image from url)
                get_vision_engine().add_product(item.id, item.image_url)
                success_count += 1
            except Exception as item_err:
                print(f"Failed to index variant {item.id}: {item_err}")
                errors.append({"id": item.id, "error": str(item_err)})
                
        return {
            "success": True,
            "indexed_count": success_count,
            "failed_count": len(errors),
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update")
async def vision_update(payload: UpdateRequest):
    try:
        get_vision_engine().add_product(payload.id, payload.image_url)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{variant_id}")
async def vision_delete(variant_id: str):
    try:
        deleted = get_vision_engine().delete_product(variant_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Variant {variant_id} not found in index")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def vision_health():
    try:
        engine = get_vision_engine()
        return {
            "status": "healthy",
            "index_size": int(engine.index.ntotal),
            "device": str(engine.device)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
