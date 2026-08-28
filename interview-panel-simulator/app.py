import streamlit as st
from openai import OpenAI
from pypdf import PdfReader
import os
import json

# Page Config
st.set_page_config(
    page_title="AI Interview Panel Simulator",
    page_icon="💼",
    layout="wide"
)

# Initialize OpenRouter Client
api_key = st.secrets.get("OPENROUTER_API_KEY", os.getenv("OPENROUTER_API_KEY", ""))

if not api_key:
    st.sidebar.error("⚠️ OPENROUTER_API_KEY missing! Add it in Streamlit Secrets or .env.")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key or "dummy_key",
)

# Free Model Assignments (Avoids dead NVIDIA endpoints)
MODELS = {
    "profile_builder": "minimax/minimax-m3:free",
    "technical": "z-ai/glm-5.2:free",
    "hr_culture": "minimax/minimax-m3:free",
    "skeptic": "z-ai/glm-5.2:free",
    "hiring_manager": "minimax/minimax-m3:free",
    "comparator": "minimax/minimax-m3:free",
    "chair": "z-ai/glm-5.2:free",
}

def extract_pdf_text(uploaded_file):
    reader = PdfReader(uploaded_file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text

def call_agent(model_key, prompt, role_description):
    model = MODELS[model_key]
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": f"You are an expert evaluator in an interview panel: {role_description}. Provide objective, concise, and structured feedback."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )
    return response.choices[0].message.content

# UI Header
st.title("💼 Multi-Agent Interview Panel Simulator")
st.caption("Upload a candidate resume PDF to trigger a 7-agent consensus evaluation.")

uploaded_file = st.file_uploader("Upload Candidate Resume (PDF)", type=["pdf"])

if uploaded_file and api_key:
    if st.button("🚀 Run Panel Evaluation", type="primary"):
        resume_text = extract_pdf_text(uploaded_file)
        
        if not resume_text.strip():
            st.error("Could not extract text from the PDF. Please check the file.")
            st.stop()
            
        results = {}
        
        with st.status("Running 7-Agent Evaluation Pipeline...", expanded=True) as status:
            st.write("1️⃣ **Profile Builder:** Extracting structured candidate facts...")
            results["profile"] = call_agent("profile_builder", f"Extract core skills, experience, and profile details:\n{resume_text}", "Profile Builder")
            
            st.write("2️⃣ **Technical Reviewer:** Analyzing engineering competency...")
            results["technical"] = call_agent("technical", f"Candidate Profile:\n{results['profile']}\nEvaluate technical depth, strengths, and flaws.", "Technical Lead")
            
            st.write("3️⃣ **HR & Culture:** Evaluating soft skills and organizational fit...")
            results["hr"] = call_agent("hr_culture", f"Candidate Profile:\n{results['profile']}\nEvaluate cultural and teamwork fit.", "HR Director")
            
            st.write("4️⃣ **Skeptic Agent:** Finding edge-cases, gaps, and resume inflation...")
            results["skeptic"] = call_agent("skeptic", f"Candidate Profile:\n{results['profile']}\nHighlight red flags, gaps, and inflated claims.", "Skeptic/Risk Auditor")
            
            st.write("5️⃣ **Hiring Manager:** Evaluating operational impact...")
            results["hiring_manager"] = call_agent("hiring_manager", f"Profile: {results['profile']}\nTech: {results['technical']}\nHR: {results['hr']}\nSkeptic: {results['skeptic']}\nMake a team placement evaluation.", "Hiring Manager")
            
            st.write("6️⃣ **Comparator:** Benchmarking against target role expectations...")
            results["comparator"] = call_agent("comparator", f"Evaluate candidate strengths against senior market standards based on this review:\n{results['hiring_manager']}", "Market Benchmark Comparator")
            
            st.write("7️⃣ **Panel Chair:** Synthesizing final hiring decision...")
            decision_prompt = f"""
            Based on all panel findings:
            Profile: {results['profile']}
            Technical: {results['technical']}
            HR: {results['hr']}
            Skeptic: {results['skeptic']}
            Hiring Manager: {results['hiring_manager']}
            Comparator: {results['comparator']}
            
            Return a FINAL DECISION. You must state clearly:
            DECISION: [STRONG HIRE / HIRE / LEAN NO HIRE / REJECT]
            SCORE: [X/10]
            EXECUTIVE SUMMARY: 3 key bullet points.
            """
            results["chair"] = call_agent("chair", decision_prompt, "Interview Panel Chair")
            status.update(label="✅ Evaluation Complete!", state="complete", expanded=False)

        # ------------------- SUMMARY DASHBOARD -------------------
        st.subheader("📋 Panel Executive Summary")
        st.info(results["chair"])
        
        st.divider()

        # ------------------- DETAILED AGENT BREAKDOWN -------------------
        st.subheader("🔍 Individual Agent Deliberations")
        tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
            "👤 Profile", "⚙️ Technical", "🤝 HR/Culture", "🧐 Skeptic", "👔 Hiring Manager", "📊 Benchmark"
        ])
        
        with tab1:
            st.markdown(results["profile"])
        with tab2:
            st.markdown(results["technical"])
        with tab3:
            st.markdown(results["hr"])
        with tab4:
            st.markdown(results["skeptic"])
        with tab5:
            st.markdown(results["hiring_manager"])
        with tab6:
            st.markdown(results["comparator"])