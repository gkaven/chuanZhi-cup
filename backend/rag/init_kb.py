# -*- coding: utf-8 -*-
"""
初始化 RAG 知识库：
1. 从 data/interview_guide/ 加载面试宝典
2. 从 MySQL questions 表加载题库
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.rag.knowledge_base import add_documents, get_collection
from backend.utils.db import get_db

SAMPLE_GUIDE = [
    {"topic": "自我介绍", "content": "自我介绍要点：1.简洁有力，控制在2分钟内；2.突出与岗位相关的经历和技能；3.展示个人亮点和成就；4.表达对岗位的热情。"},
    {"topic": "职业规划", "content": "职业规划回答要点：1.短期目标与岗位匹配；2.中期目标体现成长路径；3.长期目标展示抱负；4.说明如何在公司实现目标。"},
    {"topic": "优缺点", "content": "优缺点回答技巧：优点要结合岗位需求举例说明；缺点要选择不影响核心工作的方面，并说明改进措施。"},
    {"topic": "项目经历", "content": "项目经历描述使用STAR法则：Situation(背景)、Task(任务)、Action(行动)、Result(结果)，结果要量化。"},
    {"topic": "离职原因", "content": "离职原因回答原则：不抱怨前公司，聚焦个人成长需求，说明新机会与自身发展的契合度。"},
    {"topic": "薪资期望", "content": "薪资谈判技巧：了解市场行情，给出合理区间，强调自身价值，可适当留有谈判空间。"},
    {"topic": "团队合作", "content": "团队合作题回答要点：举具体案例，说明自己在团队中的角色，如何协调分歧，最终达成目标。"},
    {"topic": "压力处理", "content": "压力处理回答：举例说明如何在高压环境下保持效率，使用时间管理和优先级排序方法。"},
]

def init_guide():
    docs = [g["content"] for g in SAMPLE_GUIDE]
    ids = [f"guide_{i}" for i in range(len(SAMPLE_GUIDE))]
    metas = [{"topic": g["topic"]} for g in SAMPLE_GUIDE]
    add_documents("interview_guide", docs, ids, metas)
    print(f"面试宝典已加载: {len(docs)} 条")

def init_questions():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id, question_text FROM questions WHERE question_text IS NOT NULL LIMIT 1000")
            rows = cur.fetchall()
    finally:
        db.close()

    if not rows:
        print("题库暂无数据，跳过")
        return

    docs = [r["question_text"] for r in rows]
    ids = [f"q_{r['id']}" for r in rows]
    add_documents("questions", docs, ids)
    print(f"题库已加载: {len(docs)} 条")

if __name__ == "__main__":
    print("初始化 RAG 知识库...")
    init_guide()
    init_questions()
    print("完成！")
