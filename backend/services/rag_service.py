import os
import json
import openai
from backend.core.config import settings

openai.api_key = settings.OPENAI_API_KEY

class RagService:
    def __init__(self):
        pass
        
    def generate_embeddings(self, text: str):
        response = openai.embeddings.create(
            input=[text],
            model="text-embedding-3-small"
        )
        return response.data[0].embedding

    def analyze_document(self, process_text: str, filename: str) -> dict:
        mock_chunks = [
            {"chunk_id": 1, "text": "YÖK Mevzuat: Lisansüstü eğitimde ALES şarttır."}
        ]

        system_prompt = """Sen bir Türk yükseköğretim mevzuatı uyum uzmanısın.
Sana bir üniversite süreci ve ilgili YÖK mevzuat parçaları verilecek.
JSON formatında yanıt ver:
{
  "compliance_score": 85,
  "label": "Kısmen Uyumlu",
  "explanation": "Açıklama",
  "articles": [
    {
      "number": "Madde 1",
      "title": "Kabul Şartları",
      "status": "Uyumsuz",
      "similarity": 0.85,
      "text": "Üniversite belgesindeki metin",
      "yok_reference": "YÖK Lisansüstü Eğitim Yönetmeliği",
      "yok_text": "YÖK metni...",
      "reasoning": ["Sebep 1"],
      "suggestion": "Düzeltme önerisi"
    }
  ]
}"""
        
        user_prompt = f"## Belge: {filename}\n{process_text[:1000]}\n\n## YÖK Parçaları:\n{mock_chunks[0]['text']}"
        
        try:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={ "type": "json_object" }
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return {
                "status": result.get("label", "Kısmen Uyumlu"),
                "articles": result.get("articles", [])
            }
        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "status": "Kısmen Uyumlu",
                "articles": []
            }

rag_service = RagService()
