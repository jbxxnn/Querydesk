'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }
  
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate()
  
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay()
  
  // Generate array of days for the current month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  
  // Add empty cells for days before the first day of the month
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => null)
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex space-x-2">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Previous Month"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200"
              type="button"
            >
              Today
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Next Month"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {dayNames.map(day => (
            <div key={day} className="bg-gray-50 text-gray-500 text-center py-2">
              {day}
            </div>
          ))}
          
          {emptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="bg-white h-24 p-2" />
          ))}
          
          {days.map(day => (
            <div 
              key={day} 
              className={`bg-white h-24 p-2 ${
                isToday(day) ? 'relative' : ''
              }`}
            >
              <span className={`
                inline-flex items-center justify-center w-8 h-8 
                ${isToday(day) 
                  ? 'bg-blue-600 text-white rounded-full' 
                  : 'text-gray-700'
                }
              `}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
