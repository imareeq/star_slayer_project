import { NextApiRequest, NextApiResponse } from 'next'

interface RequestBody {
  query?: string
  data?: string
  model?: string
  messages?: Array<{ role: string; content: string }>
  systemPrompt?: string
  userPrompt?: string
  max_tokens?: number
  temperature?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Extract parameters from request body
    const {
      query = '',
      data = '',
      model = 'llama-3.1-sonar-small-128k-online',
      messages,
      systemPrompt = 'You are an AI assistant that helps make decisions based on provided data. Analyze the given information and provide a clear, concise decision with reasoning. Focus on practical, actionable advice.',
      userPrompt,
      max_tokens = 500,
      temperature = 0.7
    } = req.body
    
    console.log(`Backend request: ${query}\n`)
    console.log(`Data provided: ${data}\n`)
    console.log(`Model: ${model}\n`)
    
    const apiKey = process.env.PERPLEXITY_API_KEY || ''
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'PERPLEXITY_API_KEY environment variable is not set',
        message: 'Please set your Perplexity API key in environment variables'
      })
    }
    
    try {
      const url = `https://api.perplexity.ai/chat/completions`
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
      
      // Use custom messages if provided, otherwise construct from prompts
      let finalMessages: Array<{ role: string; content: string }>
      
      if (messages && Array.isArray(messages)) {
        finalMessages = messages
      } else {
        // Construct messages from prompts
        const finalUserPrompt = userPrompt || `Query: ${query}
        
        Data provided: ${data || 'No specific data provided'}
        
        Please provide a decision and reasoning based on this information.`
        
        finalMessages = [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: finalUserPrompt
          }
        ]
      }
      
      const requestBody: Record<string, any> = {
        model,
        messages: finalMessages,
        max_tokens,
        temperature
      }
      
      console.log('Making request to Perplexity API...')
      console.log('Request body:', JSON.stringify(requestBody, null, 2))
      
      const response: Response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Perplexity API error:', response.status, errorText)
        return res.status(response.status).json({
          error: 'Perplexity API request failed',
          details: errorText,
          status: response.status
        })
      }
      
      const apiResponse: any = await response.json()
      console.log('Perplexity API response received')
      
      // Extract the AI response
      const aiResponse = apiResponse.choices?.[0]?.message?.content || 'No response generated'
      
      res.status(200).json({ 
        success: true,
        query: query,
        providedData: data,
        aiDecision: aiResponse,
        timestamp: new Date().toISOString(),
        model: apiResponse.model || model,
        usage: apiResponse.usage || null
      })
      
    } catch (error) {
      console.error('Error calling Perplexity API:', error)
      res.status(500).json({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
    
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
