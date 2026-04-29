<div align="center">
  <br />
  <h1>⚖️ ComplianceAI</h1>
  <p><strong>YÖK Mevzuat Denetim Sistemi & RAG Pipeline Araştırması</strong></p>
  
  [![React](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg?logo=vite)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Python](https://img.shields.io/badge/Python-3.10+-3776AB.svg?logo=python)](https://www.python.org/)
</div>

---

## 📖 Proje Hakkında

**ComplianceAI**, üniversitelerin ve akademik kurumların **Yükseköğretim Kurulu (YÖK)** mevzuatlarına uyumluluğunu yapay zeka destekli olarak denetleyen, Retrieval-Augmented Generation (RAG) mimarisi üzerine kurulu akıllı bir asistan platformudur. 

Proje, hem kurumsal belgelerin mevzuata uygunluğunu saniyeler içinde analiz eden modern bir kullanıcı arayüzü sunar, hem de arka planda RAG boru hatlarının (pipeline) başarımını (BM25, Dense, Hybrid) ölçen kapsamlı bir benchmark altyapısı barındırır.

## ✨ Öne Çıkan Özellikler

- 🔍 **Akıllı Belge Analizi:** PDF ve dokümanlarınızı yükleyerek YÖK yönetmeliklerine uygunluk durumunu anında analiz edin.
- 🤖 **Yapay Zeka Destekli RAG:** Kurum içi belgelerinizi, güncel mevzuat veri tabanı ile vektörel olarak karşılaştırır.
- 📊 **Benchmark & Metrikler:** Farklı geri getirme (retrieval) yöntemlerinin (BM25 vs. FAISS Dense vs. Hybrid) doğruluğunu ve maliyetini ölçen deney altyapısı.
- 🎨 **Modern Arayüz:** Kullanıcı dostu, Tailwind CSS ile tasarlanmış tam duyarlı (responsive) modern bir dashboard (Yönetim Paneli).

---

## 🏗️ Proje Mimarisi

Sistem 3 temel bileşenden oluşmaktadır:

| Bileşen | Klasör | Teknolojiler | Açıklama |
|---|---|---|---|
| **Frontend** | `frontend/complianceai` | React, Vite, Tailwind CSS, Recharts | Son kullanıcıların sistemle etkileşime girdiği analiz ekranları ve yönetim paneli. |
| **Backend** | `backend/` | FastAPI, Python | Arayüzün isteklerini işleyen ve yapay zeka model çıkarımlarını sunan REST API servisi. |
| **Experiments** | `fix_experiments/` | Python, FAISS, Pandas | RAG modellerinin başarısını ölçen, "gold label" üreten ve sonuçları görselleştiren araştırma betikleri. |

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin.

### 1. Frontend'i Başlatma

Kullanıcı arayüzünü ayağa kaldırmak için Node.js kurulu olmalıdır:

```bash
cd frontend/complianceai
npm install
npm run dev
```
> 🌐 Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine giderek uygulamayı görüntüleyebilirsiniz.

### 2. Backend'i Başlatma

API sunucusunu başlatmak için Python sanal ortamınızı (`.venv`) kullanın:

```bash
# Proje kök dizininde çalıştırın:
source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```
> ⚙️ Swagger API dokümantasyonuna [http://localhost:8000/docs](http://localhost:8000/docs) üzerinden erişebilirsiniz.

---

## 🔬 Araştırma ve Deneyler (RAG Pipeline)

Sistemin RAG performansını ölçmek için `fix_experiments` klasöründeki araçları kullanabilirsiniz. (Komutları proje kök dizininde, sanal ortam aktifken çalıştırın):

```bash
# 1. FAISS vektör veritabanını oluşturma (Ön işleme)
python fix_experiments/prebuild_faiss.py

# 2. Deneyler için referans (Gold Label) verisi üretme
python fix_experiments/generate_gold_labels.py

# 3. Temel Benchmark testlerini koşturma
python fix_experiments/run_benchmark_clean.py

# 4. Sonuçlardan detaylı grafikler ve analiz tabloları üretme
python fix_experiments/visualize_results.py
```
> 📈 **Not:** Tüm deney çıktıları, tablolar ve grafikler otomatik olarak `experiment_outputs/` klasörüne kaydedilir.

---

<div align="center">
  <p><i>Senior Design Project</i></p>
</div>
