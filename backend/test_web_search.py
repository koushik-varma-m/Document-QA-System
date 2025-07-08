#!/usr/bin/env python3
"""
Test script for web search functionality
This script demonstrates how the Dappier web search integration works.
"""

import asyncio
import os
from dotenv import load_dotenv
from dappier import Dappier

load_dotenv()

async def test_web_search():
    """Test the web search functionality"""
    
    # Check if OpenAI API key is available
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        print("❌ OPENAI_API_KEY not found in environment variables")
        print("Please add your OpenAI API key to the .env file")
        return
    
    try:
        # Initialize Dappier
        print("🔧 Initializing Dappier...")
        dappier = Dappier(api_key=openai_api_key)
        print("✅ Dappier initialized successfully")
        
        # Test questions
        test_questions = [
            "What are the latest developments in AI technology?",
            "What's the current weather in New York?",
            "What are the recent changes in OpenAI's pricing?",
            "What's happening with cryptocurrency prices today?"
        ]
        
        print("\n🌐 Testing web search functionality...")
        print("=" * 50)
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n{i}. Question: {question}")
            print("-" * 30)
            
            try:
                # Perform web search
                result = await asyncio.to_thread(
                    dappier.search_real_time_data_string,
                    question
                )
                
                if result:
                    # Truncate for display
                    display_result = result[:300] + "..." if len(result) > 300 else result
                    print(f"✅ Web search result: {display_result}")
                else:
                    print("❌ No web search results found")
                    
            except Exception as e:
                print(f"❌ Web search failed: {e}")
            
            print()
        
        print("=" * 50)
        print("🎉 Web search test completed!")
        print("\n💡 Cost Control Tips:")
        print("• Web searches use your OpenAI API quota")
        print("• Each search adds ~500-1000 tokens to your usage")
        print("• Use the auto-detection feature to minimize costs")
        print("• Monitor your usage in the OpenAI dashboard")
        
    except Exception as e:
        print(f"❌ Error initializing Dappier: {e}")

if __name__ == "__main__":
    asyncio.run(test_web_search()) 