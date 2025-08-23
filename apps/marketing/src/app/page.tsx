"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, Users, TrendingUp } from "lucide-react";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValidEmail(validateEmail(value));
  };

  const handleDemoRequest = () => {
    if (isValidEmail) {
      // Handle demo request logic here
      console.log("Demo requested for:", email);
    }
  };

  return (
    <section className="bg-background min-h-screen flex items-center">
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
                Effortless Bookings for the World&apos;s Most{" "}
                <span className="text-violet-600">Exclusive Spas</span>
              </h1>

              <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                From appointment scheduling to client follow-ups — elevate your
                med spa experience with software designed for luxury service
                providers.
              </p>
            </div>

            {/* Email Capture & CTA */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <Input
                  type="email"
                  placeholder="Enter your business email"
                  value={email}
                  onChange={handleEmailChange}
                  className="flex-1 h-12 text-base border-slate-300 focus:border-violet-500 focus:ring-violet-500"
                />
                <Button
                  onClick={handleDemoRequest}
                  disabled={!isValidEmail}
                  className={`h-12 px-6 font-medium luxury-button-hover ${
                    isValidEmail
                      ? "bg-violet-600 hover:bg-violet-700 text-white"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  Request Private Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-slate-500">
                Join 500+ luxury med spas already using our platform
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-8 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-medium text-slate-700">
                  Smart Scheduling
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-medium text-slate-700">
                  Client Management
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                <span className="text-sm font-medium text-slate-700">
                  Revenue Growth
                </span>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="relative z-10">
              {/* Mockup Container */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-1 transition-transform duration-500">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Today&apos;s Schedule
                    </h3>
                    <div className="w-3 h-3 bg-violet-600 rounded-full"></div>
                  </div>

                  {/* Appointment Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                      <div className="w-2 h-8 bg-violet-600 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          Botox Consultation
                        </p>
                        <p className="text-sm text-slate-600">
                          Sarah Johnson • 10:00 AM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-2 h-8 bg-slate-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          Facial Treatment
                        </p>
                        <p className="text-sm text-slate-600">
                          Emma Davis • 2:30 PM
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-2 h-8 bg-slate-400 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          Laser Session
                        </p>
                        <p className="text-sm text-slate-600">
                          Michael Chen • 4:00 PM
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-transparent rounded-3xl transform -rotate-6 scale-105"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
