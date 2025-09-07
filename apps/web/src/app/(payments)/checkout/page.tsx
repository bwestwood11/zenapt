import CheckoutComponent from '@/components/checkout/checkout-modal'
import React from 'react'

const CheckoutPage = async () => {
  return (
    <div>
      <img src="https://cdn.dribbble.com/userupload/36923056/file/original-e5800727c39cde0f6cb919b2adb4d83c.jpg?resize=1024x768&vertical=center" className="w-full h-full bg-background" />
      <CheckoutComponent />
    </div>
  )
}

export default CheckoutPage