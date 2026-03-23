"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Beams from "@/components/Beams";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen w-screen">
      <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
        />
      </div>

      <div className="relative z-10 flex h-full w-full min-h-0">
        <Sidebar />
        <div className="flex min-h-0 flex-col flex-1">
          <Header />
          <main className="min-h-0 flex-1 overflow-y-auto p-6 bg-transparent">{children}</main>
        </div>
      </div>
    </div>
  );
}
