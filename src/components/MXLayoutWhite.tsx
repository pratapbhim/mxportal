'use client'

import React from 'react'
import UserHeader from './UserHeader'
import { MXSidebarWhite } from './MXSidebarWhite'

interface MXLayoutWhiteProps {
  children: React.ReactNode
  restaurantName?: string
  restaurantId?: string
}

export const MXLayoutWhite: React.FC<MXLayoutWhiteProps> = ({
  children,
  restaurantName,
  restaurantId
}) => {
  return (
    <div className="flex h-screen bg-white">
      <MXSidebarWhite restaurantName={restaurantName} restaurantId={restaurantId} />
      <main className="flex-1 md:ml-64 overflow-auto hide-scrollbar">
        <UserHeader />
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </main>
    </div>
  )
}
