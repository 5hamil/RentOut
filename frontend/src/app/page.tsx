'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Camera, Search, Video, Lightbulb, Mic, ShieldCheck, CreditCard, Headphones, Box, ArrowRight, ShieldAlert } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/listings?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/listings');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <div className="flex w-full flex-col bg-white text-foreground selection:bg-gray-100 selection:text-black">
      
      {/* ─── Hero Section ─── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 sm:pt-40 sm:pb-32 lg:px-8 w-full border-b border-gray-100 overflow-hidden">
        
        {/* Minimalist Background Image */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://plus.unsplash.com/premium_photo-1684785617500-fb22234eeedd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
            alt="Hero background" 
            fill 
            sizes="100vw"
            className="object-cover object-center opacity-70"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
        </div>

        <motion.div 
          className="relative z-10 mx-auto max-w-3xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8 inline-flex items-center rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
            <span className="mr-2 flex h-1.5 w-1.5 rounded-full bg-black"></span>
            Peer-to-peer equipment rental
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl font-heading font-black tracking-tighter text-black sm:text-7xl lg:text-8xl leading-[1.05]">
            Rent the best.<br />
            Create the best.
          </motion.h1>
          
          <motion.p variants={itemVariants} className="mx-auto mt-8 max-w-xl text-lg text-gray-500 font-normal leading-relaxed">
            Stop buying gear for one shoot. Access high-end cameras, drones, and audio equipment directly from local creators.
          </motion.p>
          
          <motion.div variants={itemVariants} className="mt-12 mx-auto max-w-xl">
            <form onSubmit={handleSearch} className="relative flex items-center w-full rounded-2xl bg-white border border-gray-200 p-2 pl-6 transition-all focus-within:border-black hover:border-gray-300">
              <Search className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" strokeWidth={1.5} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras, drones, lenses..." 
                className="w-full bg-transparent outline-none text-black placeholder:text-gray-400 text-base"
              />
              <button 
                type="submit" 
                className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Search
              </button>
            </form>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Bento Grid Categories ─── */}
      <section className="mx-auto w-full max-w-[1200px] px-6 py-12 sm:px-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {/* Main Large Card */}
          <Link href="/listings?category=camera" className="group md:col-span-2 md:row-span-2 relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-gray-50 p-8 transition-colors hover:bg-gray-100 border border-gray-100/50">
            <div className="flex justify-between items-start">
              <Camera strokeWidth={1} className="h-12 w-12 text-black" />
              <ArrowRight strokeWidth={1.5} className="h-6 w-6 text-gray-400 opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-black" />
            </div>
            <div className="mt-24">
              <h3 className="text-3xl font-heading font-bold text-black tracking-tight mb-2">Cameras</h3>
              <p className="text-gray-500 font-medium max-w-[250px]">Cinema cameras, mirrorless, and DSLRs for any production.</p>
            </div>
          </Link>

          {/* Medium Card 1 */}
          <Link href="/listings?category=lens" className="group md:col-span-2 relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white border border-gray-200 p-8 transition-colors hover:border-gray-300">
            <div className="flex justify-between items-start">
              <div className="h-10 w-10 rounded-full border border-gray-200 flex items-center justify-center">
                <Search strokeWidth={1.5} className="h-5 w-5 text-black" />
              </div>
              <ArrowRight strokeWidth={1.5} className="h-5 w-5 text-gray-400 opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-black" />
            </div>
            <div className="mt-12">
              <h3 className="text-xl font-heading font-bold text-black tracking-tight mb-1">Lenses</h3>
              <p className="text-sm text-gray-500 font-medium">Primes, zooms, and vintage glass.</p>
            </div>
          </Link>

          {/* Small Card 1 */}
          <Link href="/listings?category=drone" className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white border border-gray-200 p-8 transition-colors hover:border-gray-300">
            <div className="flex justify-between items-start">
              <Video strokeWidth={1.5} className="h-8 w-8 text-black" />
            </div>
            <div className="mt-12">
              <h3 className="text-lg font-heading font-bold text-black tracking-tight mb-1">Drones</h3>
              <p className="text-sm text-gray-500 font-medium">Aerial platforms.</p>
            </div>
          </Link>

          {/* Small Card 2 */}
          <Link href="/listings?category=lighting" className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-black p-8 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-start">
              <Lightbulb strokeWidth={1.5} className="h-8 w-8 text-white" />
            </div>
            <div className="mt-12">
              <h3 className="text-lg font-heading font-bold text-white tracking-tight mb-1">Lighting</h3>
              <p className="text-sm text-gray-400 font-medium">LEDs & Strobes.</p>
            </div>
          </Link>

          {/* Bottom Row */}
          <Link href="/listings?category=audio" className="group md:col-span-2 relative flex items-center justify-between overflow-hidden rounded-[2rem] bg-white border border-gray-200 p-8 transition-colors hover:border-gray-300">
            <div>
              <h3 className="text-xl font-heading font-bold text-black tracking-tight mb-1">Audio Gear</h3>
              <p className="text-sm text-gray-500 font-medium">Mics, recorders, and lavs.</p>
            </div>
            <Mic strokeWidth={1} className="h-12 w-12 text-gray-200 group-hover:text-black transition-colors" />
          </Link>

          <Link href="/listings" className="group md:col-span-2 relative flex items-center justify-between overflow-hidden rounded-[2rem] bg-gray-50 border border-gray-100/50 p-8 transition-colors hover:bg-gray-100">
            <div>
              <h3 className="text-xl font-heading font-bold text-black tracking-tight mb-1">View All Categories</h3>
              <p className="text-sm text-gray-500 font-medium">Browse the full catalog.</p>
            </div>
            <Box strokeWidth={1} className="h-12 w-12 text-black opacity-40 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      </section>

      {/* ─── Minimal Trust Section ─── */}
      <section className="w-full mt-12 mb-32 py-12">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col rounded-[2rem] border border-gray-200 p-10 bg-white transition-colors hover:border-gray-300">
              <ShieldCheck strokeWidth={1} className="h-10 w-10 text-black mb-6" />
              <h3 className="text-lg font-heading font-bold text-black mb-2 tracking-tight">Verified ID required</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">Every user is identity-verified before transacting, maintaining a high standard of trust and safety across the platform.</p>
            </div>
            
            <div className="flex flex-col rounded-[2rem] border border-gray-200 p-10 bg-white transition-colors hover:border-gray-300">
              <CreditCard strokeWidth={1} className="h-10 w-10 text-black mb-6" />
              <h3 className="text-lg font-heading font-bold text-black mb-2 tracking-tight">Escrow payments</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">Deposits are safely held in escrow. Rents are processed securely and released only when gear is safely returned.</p>
            </div>
            
            <div className="flex flex-col rounded-[2rem] border border-gray-200 p-10 bg-white transition-colors hover:border-gray-300">
              <ShieldAlert strokeWidth={1} className="h-10 w-10 text-black mb-6" />
              <h3 className="text-lg font-heading font-bold text-black mb-2 tracking-tight">Fair mediation</h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">In the rare event of a dispute, our impartial team steps in to review evidence and resolve issues fairly for both sides.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
