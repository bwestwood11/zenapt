import ServicesPage from '@/components/services/service-view'
import { requirePermission } from '@/lib/permissions/permission'
import React from 'react'

const Service = async () => {
  await requirePermission(["READ::SERVICE"])
  return (
    <ServicesPage />
  )
}

export default Service