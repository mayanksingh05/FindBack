"""Embedding generation service for text and image data.
Uses SentenceTransformers (all-MiniLM-L6-v2, 384 dims) for text
and OpenCLIP (ViT-B-32, 512 dims) for images.
"""
import os
import logging
from typing import Optional, List
from PIL import Image
import torch

from backend.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    _instance = None
    _text_model = None
    _clip_model = None
    _clip_preprocess = None
    _device = "cuda" if torch.cuda.is_available() else "cpu"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    @classmethod
    def get_text_model(cls):
        if cls._text_model is None:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading sentence-transformer model: {settings.TEXT_EMBEDDING_MODEL} on {cls._device}")
            cls._text_model = SentenceTransformer(settings.TEXT_EMBEDDING_MODEL, device=cls._device)
        return cls._text_model

    @classmethod
    def get_clip_model(cls):
        if cls._clip_model is None:
            import open_clip
            logger.info(
                f"Loading OpenCLIP model: {settings.IMAGE_EMBEDDING_MODEL} ({settings.IMAGE_EMBEDDING_PRETRAINED}) on {cls._device}"
            )
            model, _, preprocess = open_clip.create_model_and_transforms(
                settings.IMAGE_EMBEDDING_MODEL,
                pretrained=settings.IMAGE_EMBEDDING_PRETRAINED,
                device=cls._device,
            )
            model.eval()
            cls._clip_model = model
            cls._clip_preprocess = preprocess
        return cls._clip_model, cls._clip_preprocess

    @classmethod
    def build_item_text(
        cls,
        item_name: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        distinguishing_info: Optional[str] = None,
        location: Optional[str] = None,
    ) -> str:
        """Construct an information-rich semantic text representation for vector encoding."""
        parts = []
        if item_name:
            parts.append(f"Item: {item_name.strip()}")
        if category:
            parts.append(f"Category: {category.strip()}")
        if description:
            parts.append(f"Description: {description.strip()}")
        if distinguishing_info:
            parts.append(f"Distinguishing Details: {distinguishing_info.strip()}")
        if location:
            parts.append(f"Location: {location.strip()}")
        return ". ".join(parts) if parts else ""

    @classmethod
    def generate_text_embedding(cls, text: str) -> Optional[List[float]]:
        """Generate a normalized 384-dimensional dense vector embedding from text."""
        if not text or not text.strip():
            return None
        try:
            model = cls.get_text_model()
            embedding = model.encode(text.strip(), normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating text embedding: {e}")
            return None

    @classmethod
    def generate_image_embedding(cls, image_path: str) -> Optional[List[float]]:
        """Generate a normalized 512-dimensional visual vector embedding from an image."""
        if not image_path:
            return None

        # Resolve path
        resolved_path = image_path
        if not os.path.isabs(resolved_path):
            # Check relative to working directory or uploads folder
            if os.path.exists(resolved_path):
                pass
            elif os.path.exists(os.path.join(settings.UPLOAD_DIR, os.path.basename(resolved_path))):
                resolved_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(resolved_path))
            elif os.path.exists(os.path.join(".", resolved_path.lstrip("/\\"))):
                resolved_path = os.path.join(".", resolved_path.lstrip("/\\"))

        if not os.path.exists(resolved_path):
            logger.warning(f"Image path does not exist for embedding: {image_path} (resolved: {resolved_path})")
            return None

        try:
            model, preprocess = cls.get_clip_model()
            image = Image.open(resolved_path).convert("RGB")
            tensor = preprocess(image).unsqueeze(0).to(cls._device)

            with torch.no_grad():
                image_features = model.encode_image(tensor)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                return image_features.cpu().numpy()[0].tolist()
        except Exception as e:
            logger.error(f"Error generating image embedding for {image_path}: {e}")
            return None


embedding_service = EmbeddingService()
