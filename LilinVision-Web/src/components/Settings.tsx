import { useState, useEffect } from 'react'
import { Globe, Save, Terminal } from 'lucide-react'

export default function Settings() {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [responses, setResponses] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/v1/settings/webhook_url')
      .then(res => res.json())
      .then(data => setWebhookUrl(data.url))
      .catch(err => console.error('Fetch error:', err))

    // Use WebSocket to listen for webhook responses
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/events`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'detection' && data.webhook_response) {
        setResponses(prev => [`[${new Date().toLocaleTimeString()}] ${data.webhook_response}`, ...prev].slice(0, 50))
      }
    }

    return () => ws.close()
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    fetch('/api/v1/settings/webhook_url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    }).finally(() => {
      setIsSaving(false)
      alert('Settings saved successfully')
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">System Settings</h1>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center gap-2">
          <Globe size={18} className="text-blue-400" />
          <h2 className="font-semibold">Remote Webhook Configuration</h2>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <p className="text-sm text-gray-400">
            When a detection occurs, the VMS server will send a POST request with detection details to this URL.
          </p>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Target URL</label>
            <div className="flex gap-2">
              <input 
                type="url" 
                placeholder="https://your-server.com/api/webhook"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
              />
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-xl flex flex-col h-[400px]">
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center gap-2">
          <Terminal size={18} className="text-purple-400" />
          <h2 className="font-semibold">Webhook Response Console</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-1 bg-black/30">
          {responses.length === 0 ? (
            <p className="text-gray-600 italic">No webhook activity yet...</p>
          ) : (
            responses.map((resp, i) => (
              <div key={i} className="text-gray-300 border-b border-gray-800 pb-1 last:border-0">
                {resp}
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 bg-gray-900/50 text-[10px] text-gray-500 flex justify-between">
          <span>WebSocket Live Stream</span>
          <span>Latest 50 responses shown</span>
        </div>
      </div>
    </div>
  )
}
