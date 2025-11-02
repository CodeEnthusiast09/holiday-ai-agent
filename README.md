# 🌍 Holiday Agent

An intelligent AI assistant that provides comprehensive information about holidays across 230+ countries worldwide. Built with Mastra and integrated with Telex.im for the HNG Internship Stage 3 Backend Task.

## 🎯 What It Does

Holiday Agent helps users discover and learn about holidays globally. It can:

- 🗓️ Find all holidays for any country and year (2001-2049)
- 🔍 Search for specific holidays across countries (e.g., "When is Mother's Day?")
- 📅 Check what holidays fall on specific dates
- ⏰ Identify today's holidays globally or by country
- 🏷️ Filter holidays by type (national, local, religious, observance)
- 📖 Provide rich descriptions and cultural context for each holiday

## ✨ Features

- **230+ Countries Coverage**: Comprehensive holiday data from around the world
- **Multiple Holiday Types**: National, local, religious, and observance holidays
- **Intelligent Responses**: Context-aware answers with emojis and formatting
- **Natural Language Understanding**: Ask questions naturally, get accurate answers
- **Memory System**: Maintains conversation context for better interactions
- **Telex.im Integration**: Works seamlessly on the Telex platform via A2A protocol

## 🛠️ Tech Stack

- **Framework**: [Mastra](https://mastra.ai)
- **Language**: TypeScript
- **AI Model**: Google Gemini 2.5 Flash
- **Data Source**: [Calendarific API](https://calendarific.com)
- **Integration**: Telex.im (A2A protocol)

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v18 or higher)
- npm or yarn
- Calendarific API key ([Get one here](https://calendarific.com/api-documentation))
- Mastra account ([Sign up here](https://mastra.ai))

## 🚀 Installation

1. **Clone the repository**

```bash
git clone https://github.com/CodeEnthusiast09/holiday-ai-agent.git
cd holiday-ai-agent
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
CALENDARIFIC_API_KEY=your_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

## 💻 Usage

### Running Locally

```bash
npm run dev
```

## 🎮 Example Queries

Here are some questions you can ask Holiday Agent:

**Country-specific holidays:**

- "What are the holidays in Nigeria for 2025?"
- "Show me US public holidays this year"
- "Tell me about Canadian holidays"

**Holiday searches:**

- "When is Mother's Day celebrated?"
- "When do countries celebrate Independence Day?"
- "Tell me about Christmas around the world"

**Date-specific queries:**

- "What holidays are on December 25th?"
- "Is June 12th a holiday anywhere?"
- "What's celebrated on my birthday, March 15th?"

**Current day:**

- "Is today a holiday?"
- "What holidays are today in the US?"
- "Are we celebrating anything today?"

**Country information:**

- "What countries do you support?"
- "Can you get holidays for Kenya?"
- "Find the country code for Nigeria"

## 🔧 Tools Overview

The agent uses specialized tools for different tasks:

| Tool                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `checkTodayHolidaysTool`    | Checks if today is a holiday                |
| `getHolidaysByCountryTool`  | Retrieves all holidays for a country        |
| `searchHolidaysByNameTool`  | Finds when specific holidays are celebrated |
| `getHolidaysForDateTool`    | Shows holidays on any date                  |
| `getAvailableCountriesTool` | Lists supported countries                   |
| `validateCountryCodeTool`   | Verifies country codes                      |
