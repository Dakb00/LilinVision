import { useState, useEffect } from 'react'
import { Search, Calendar, Image as ImageIcon, X } from 'lucide-react'

interface Detection {
  id: number
  camera_id: number
  timestamp: number
  label: string
  confidence: number
}

export default function Database() {
  const [detections, setDetections] = useState<Detection[]>([])
  const [filter, setFilter] = useState('')
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/v1/detections')
      .then(res => res.json())
      .then(setDetections)
      .catch(err => console.error('Fetch error:', err))
  }, [])

  const filtered = detections.filter(d => 
    d.label.toLowerCase().includes(filter.toLowerCase()) ||
    d.camera_id.toString() === filter
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Detection History</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by label or camera ID..." 
            className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase">
              <th className="px-6 py-3 font-semibold">Time</th>
              <th className="px-6 py-3 font-semibold">Camera</th>
              <th className="px-6 py-3 font-semibold">Label</th>
              <th className="px-6 py-3 font-semibold">Confidence</th>
              <th className="px-6 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filtered.map((det) => (
              <tr key={det.id} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-4 flex items-center gap-2">
                  <Calendar size={14} className="text-gray-500" />
                  {new Date(det.timestamp * 1000).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-gray-300">#{det.camera_id}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs font-bold uppercase tracking-wider">
                    {det.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">{(det.confidence * 100).toFixed(1)}%</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => setSelectedImage(det.id)}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <ImageIcon size={16} />
                    View Snapshot
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                  No detections found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full relative" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-1"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} /> Close
            </button>
            <div className="p-2">
              <img 
                src={`/api/v1/detections/${selectedImage}/snapshot`} 
                alt="Detection Snapshot" 
                className="w-full h-auto rounded shadow-2xl"
              />
            </div>
            <div className="p-4 border-t border-gray-700 text-center text-gray-400">
              Snapshot from Detection #{selectedImage}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
