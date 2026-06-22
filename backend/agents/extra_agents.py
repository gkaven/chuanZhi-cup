import json
from openai import OpenAI
from backend.config import KIMI_API_KEY, KIMI_BASE_URL, KIMI_MODEL

client = OpenAI(api_key=KIMI_API_KEY, base_url=KIMI_BASE_URL)

COVER_LETTER_PROMPT = """你是一个求职信写作专家。根据简历和目标岗位，生成一封专业的求职信。
格式：开头自我介绍+应聘意向，中段核心优势与岗位匹配点，结尾表达意愿+联系方式。
输出Markdown格式。"""

SALARY_PROMPT = """你是一个薪资谈判顾问。根据用户提供的信息给出专业建议。
输出JSON：{"market_range": "15k-25k", "strategy": "建议策略", "talking_points": ["话术1"], "notes": ["注意事项"]}"""

CAREER_PROMPT = """你是一个职业规划顾问。根据用户背景给出职业发展建议。
输出JSON：{"short_term": "1年目标", "mid_term": "3年目标", "long_term": "5年目标", "action_items": ["行动项"]}"""

def cover_letter(resume_text: str, position: str, company: str) -> str:
    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": COVER_LETTER_PROMPT},
                {"role": "user", "content": f"简历：{resume_text[:1500]}\n目标岗位：{position}\n目标公司：{company}"}
            ],
            temperature=0.7, max_tokens=1000,
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"求职信生成失败，请检查网络：{str(e)[:60]}"

def salary_negotiation(position: str, city: str, years: int, current_salary: str) -> dict:
    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": SALARY_PROMPT},
                {"role": "user", "content": f"岗位：{position}，城市：{city or '未指定'}，工作年限：{years or '未知'}年，当前薪资：{current_salary or '未知'}"}
            ],
            temperature=0.3, max_tokens=600,
        )
        try:
            return json.loads(resp.choices[0].message.content)
        except json.JSONDecodeError:
            return {"market_range": "暂无数据", "strategy": resp.choices[0].message.content, "talking_points": [], "notes": []}
    except Exception as e:
        return {"market_range": "获取失败", "strategy": f"服务暂时不可用：{str(e)[:60]}", "talking_points": [], "notes": []}

def career_plan(background: str) -> dict:
    try:
        resp = client.chat.completions.create(
            model=KIMI_MODEL,
            messages=[
                {"role": "system", "content": CAREER_PROMPT},
                {"role": "user", "content": f"用户背景：{background[:1500]}"}
            ],
            temperature=0.5, max_tokens=800,
        )
        try:
            return json.loads(resp.choices[0].message.content)
        except json.JSONDecodeError:
            return {"short_term": resp.choices[0].message.content, "mid_term": "", "long_term": "", "action_items": []}
    except Exception as e:
        return {"short_term": f"服务暂时不可用：{str(e)[:60]}", "mid_term": "", "long_term": "", "action_items": []}
