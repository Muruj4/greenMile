from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import anthropic
import os
import traceback
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    company_id: int
    company_name: str = "Your Company"
    message: str
    conversation_history: List[ChatMessage] = []
    dashboard_snapshot: dict = {}

@router.post("/api/ai-agent/chat")
async def chat_with_agent(request: ChatRequest):
    try:
        snap = request.dashboard_snapshot

        total_trips    = snap.get("totalTrips", 0)
        total_drivers  = snap.get("totalDrivers", 0)
        total_vehicles = snap.get("totalVehicles", 0)
        total_co2e     = snap.get("totalCO2e", 0)

        dist      = snap.get("routeDistribution", {})
        breakdown = snap.get("emissionsBreakdown", {})
        savings   = snap.get("get_fuel_cost_savings_percentage", 0)

        green  = dist.get("green", 0)
        orange = dist.get("orange", 0)
        red    = dist.get("red", 0)

        co2 = breakdown.get("co2", 0)
        ch4 = breakdown.get("ch4", 0)
        n2o = breakdown.get("n2o", 0)

        system_prompt = f"""You are GreenMile's AI Sustainability Assistant for logistics managers in Saudi Arabia.

You support BOTH Arabic and English. Always respond in the same language the user writes in.

════════════════════════════════════
LIVE DASHBOARD DATA for {request.company_name}
════════════════════════════════════

CORE KPIs:
  - Total Trips: {total_trips}
  - Total Drivers: {total_drivers}
  - Vehicle Types (distinct): {total_vehicles}
  - Total CO2e Emissions: {round(float(total_co2e), 2)} kg

ROUTE DISTRIBUTION:
  - Green routes: {green}
  - Orange routes: {orange}
  - Red routes: {red}

EMISSIONS BREAKDOWN:
  - CO2: {round(float(co2), 2)} kg
  - CH4: {round(float(ch4), 4)} kg
  - N2O: {round(float(n2o), 4)} kg

FINANCIAL:
  - Fuel Cost Savings: {round(float(savings), 1)}%

════════════════════════════════════

STRICT RULES:
1. The numbers above are REAL and LIVE — trust them completely
2. NEVER say data is missing or zero if the numbers above are non-zero
3. If Total Drivers is {total_drivers}, always say {total_drivers} drivers — never say "no data"
4. If Vehicle Types is {total_vehicles}, always say {total_vehicles} types — never say "no data"
5. Respond in the same language the user writes in
6. Reference Saudi Vision 2030 / Saudi Green Initiative where relevant
7. Be concise and data-driven"""

        messages_to_send = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]
        messages_to_send.append({"role": "user", "content": request.message})

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=system_prompt,
            messages=messages_to_send
        )

        assistant_reply = response.content[0].text

        updated_history = list(request.conversation_history) + [
            ChatMessage(role="user", content=request.message),
            ChatMessage(role="assistant", content=assistant_reply)
        ]

        return {
            "reply": assistant_reply,
            "updated_history": [{"role": m.role, "content": m.content} for m in updated_history]
        }

    except Exception as e:
        print(f"CHAT ENDPOINT ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Agent error: {str(e)}")