'use client' 
 
import { useSession } from 'next-auth/react' 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' 
import { Button } from '@/components/ui/button' 
 
export default function SimpleDashboard() { 
  const { data: session } = useSession() 
 
  if (!session) { 
    return div Loading... /div 
  } 
 
  return ( 
    div className="min-h-screen bg-gray-50 p-8" 
      Card className="max-w-4xl mx-auto" 
        CardHeader 
          CardTitle PatentFlow Enterprise Dashboard /CardTitle 
        /CardHeader 
        CardContent 
          div className="text-center space-y-4" 
            h1 className="text-2xl font-bold" Welcome to PatentFlow Enterprise! /h1 
            p className="text-gray-600" You are successfully logged in. /p 
            div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" 
            /div 
            div className="mt-6" 
              Button onClick={() = window.location.href = '/auth/signin'} Sign Out /Button 
            /div 
          /div 
        /CardContent 
      /Card 
    /div 
  ) 
  ) 
} 
