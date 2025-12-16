import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  ShieldAlert, BrainCircuit, MapPin, Radio, ArrowRight, Eye,
  Database, Cpu, Network, Layers, Target, Zap, CheckCircle2,
  Camera, Phone, MessageSquare, GitMerge, BarChart3, Users
} from "lucide-react";

const LandingPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -50]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground overflow-x-hidden font-body selection:bg-primary/30">
      
      {/* --- HERO SECTION --- */}
      <motion.section 
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--muted)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--muted)/0.5)_1px,transparent_1px)] bg-[size:80px_80px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        
        <div className="z-10 text-center px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <div className="relative p-3 rounded-xl bg-primary/10 border border-primary/20">
                <ShieldAlert className="w-8 h-8 text-primary" />
              </div>
              <span className="text-xl tracking-[0.2em] text-foreground font-display font-semibold uppercase">
                Argus.AI
              </span>
            </motion.div>
            
            {/* Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6 leading-[1.1]"
            >
              Intelligent Crisis Response
              <br />
              <span className="text-primary">Platform</span>
            </motion.h1>
            
            {/* Subtitle */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              A unidirectional, event-driven architecture that transforms unstructured multimodal data into actionable intelligence for emergency response operations.
            </motion.p>

            {/* CTA Buttons - RESTORED VIEW ARCHITECTURE BUTTON */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                to="/dashboard" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
              >
                Access Command Center
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a 
                href="#architecture" 
                className="inline-flex items-center gap-2 px-8 py-4 border border-border text-foreground font-semibold rounded-lg hover:bg-muted/50 transition-all duration-200"
              >
                View Architecture
              </a>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="flex items-center justify-center gap-8 mt-16 pt-8 border-t border-border/50"
            >
              <TrustBadge icon={<Cpu className="w-4 h-4" />} label="Powered by Gemini AI" />
              <TrustBadge icon={<Zap className="w-4 h-4" />} label="Real-time Processing" />
              <TrustBadge icon={<Eye className="w-4 h-4" />} label="Multimodal Analysis" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* --- SYSTEM OVERVIEW --- */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-2 block">System Overview</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              End-to-End Crisis Management
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From raw data ingestion to unit deployment, Argus provides complete situational awareness and automated response coordination.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricCard value="<2s" label="Detection Latency" icon={<Zap className="w-5 h-5" />} delay={0} />
            <MetricCard value="99.9%" label="System Uptime" icon={<CheckCircle2 className="w-5 h-5" />} delay={0.1} />
            <MetricCard value="3" label="Data Streams" icon={<Database className="w-5 h-5" />} delay={0.2} />
            <MetricCard value="5" label="Processing Phases" icon={<Layers className="w-5 h-5" />} delay={0.3} />
          </div>
        </div>
      </section>

      {/* --- ARCHITECTURE SECTION --- */}
      <section id="architecture" className="py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-primary text-sm font-semibold tracking-wider uppercase mb-2 block">Technical Architecture</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Five-Phase Processing Pipeline
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A unidirectional, event-driven architecture converting unstructured multimodal noise into structured, actionable intelligence.
            </p>
          </motion.div>

          {/* Phase 1 */}
          <PhaseSection 
            phase="01"
            title="Multimodal Data Ingestion"
            description="The system captures raw data from edge devices and public APIs across three distinct data streams before processing occurs."
            delay={0}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <DataStreamCard 
                icon={<MessageSquare className="w-5 h-5" />}
                title="Social Media Text"
                description="Text-based reports containing keywords related to emergencies (fire, help, accident)"
              />
              <DataStreamCard 
                icon={<Camera className="w-5 h-5" />}
                title="Images / CCTV"
                description="Visual data from user uploads or connected surveillance feeds providing concrete evidence"
              />
              <DataStreamCard 
                icon={<Phone className="w-5 h-5" />}
                title="911 Audio Calls"
                description="Raw voice data containing critical emotional cues and background noise"
              />
            </div>
          </PhaseSection>

          {/* Phase 2 */}
          <PhaseSection 
            phase="02"
            title="AI Analysis Engine"
            description="Utilizing Google Gemini's multimodal AI capabilities to interpret raw data into semantic meaning through parallel processing streams."
            delay={0.1}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <AnalysisCard 
                icon={<BrainCircuit className="w-5 h-5" />}
                title="NLP & Sentiment Analysis"
                input="Social Media Text"
                function="Parses text to understand intent and urgency, extracts key entities (locations, names), and gauges panic levels"
              />
              <AnalysisCard 
                icon={<Eye className="w-5 h-5" />}
                title="Computer Vision"
                input="Images / CCTV Frames"
                function="Identifies hazardous objects: smoke plumes, fire, collapsed structures, weapons, crowd density"
              />
              <AnalysisCard 
                icon={<Radio className="w-5 h-5" />}
                title="Acoustic Detection"
                input="911 Audio Calls"
                function="Transcribes speech-to-text and detects non-speech signatures: sirens, screaming, explosions, gunshots"
              />
            </div>
          </PhaseSection>

          {/* Phase 3 */}
          <PhaseSection 
            phase="03"
            title="Data Fusion & Verification"
            description="The central processing unit where individual signals are aggregated to form coherent, verified incident reports."
            delay={0.2}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <FusionCard 
                icon={<GitMerge className="w-5 h-5" />}
                title="Multi-Signal Correlator"
                description="Cross-references NLP, Vision, and Acoustic outputs. Marks incidents as 'High Confidence' when multiple sources corroborate."
              />
              <FusionCard 
                icon={<MapPin className="w-5 h-5" />}
                title="Geolocation Triangulation"
                description="Extracts spatial data from explicit addresses, GPS metadata, and landmark references to pinpoint exact coordinates."
              />
              <FusionCard 
                icon={<BarChart3 className="w-5 h-5" />}
                title="Severity Scoring Model"
                description="Assigns priority rating (1-10) based on triggers: fire (+3), people trapped (+5), high panic sentiment (+2)."
              />
            </div>
          </PhaseSection>

          {/* Phase 4 */}
          <PhaseSection 
            phase="04"
            title="Commander Dashboard"
            description="Processed intelligence visualized for human operators via a React/Leaflet interface providing complete situational awareness."
            delay={0.3}
          >
            <div className="grid md:grid-cols-3 gap-4">
              <DashboardCard 
                icon={<Target className="w-5 h-5" />}
                title="Real-time Map"
                description="Displays incidents as pulsing markers showing locations of both hazards and friendly units"
              />
              <DashboardCard 
                icon={<Layers className="w-5 h-5" />}
                title="Evidence Panel"
                description="Shows why AI flagged each incident with specific evidence (Visual: Smoke, Audio: Sirens)"
              />
              <DashboardCard 
                icon={<Network className="w-5 h-5" />}
                title="Proximity Calculator"
                description="Uses Haversine Formula to compute distances between incidents and all available fleet units"
              />
            </div>
          </PhaseSection>

          {/* Phase 5 */}
          <PhaseSection 
            phase="05"
            title="Action & Deployment"
            description="The final phase handles physical response mechanics with automated unit suggestion and one-click dispatch capabilities."
            delay={0.4}
            isLast
          >
            <div className="grid md:grid-cols-3 gap-4">
              <DeploymentCard 
                icon={<Users className="w-5 h-5" />}
                title="Smart Unit Suggestion"
                description="Identifies units that are closest (shortest travel time) and idle (not busy) for optimal assignment"
              />
              <DeploymentCard 
                icon={<Zap className="w-5 h-5" />}
                title="One-Click Dispatch"
                description="Links IncidentID to UnitID in database, notifies unit with coordinates and severity data"
              />
              <DeploymentCard 
                icon={<Radio className="w-5 h-5" />}
                title="Feedback Loop"
                description="Unit status updates (IDLE → BUSY) feed back to map visualization in real-time"
              />
            </div>
          </PhaseSection>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 border-t border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Deploy?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Access the Argus Command Center to begin monitoring, analyzing, and responding to incidents in real-time.
            </p>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-lg shadow-primary/20"
            >
              Launch Command Center
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Argus.AI</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2024 Argus.AI Crisis Response System. Powered by Google Gemini.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// --- HELPER COMPONENTS (Internal to keep file count low) ---

const TrustBadge = ({ icon, label }: any) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    {icon}
    <span className="text-sm">{label}</span>
  </div>
);

const MetricCard = ({ value, label, icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-6 bg-card border border-border rounded-xl"
  >
    <div className="flex items-center gap-2 text-primary mb-3">{icon}</div>
    <div className="text-3xl font-display font-bold text-foreground mb-1">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </motion.div>
);

const PhaseSection = ({ phase, title, description, children, delay, isLast = false }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.6 }}
    className={`relative ${!isLast ? 'pb-16 mb-16 border-b border-border/50' : ''}`}
  >
    <div className="flex items-start gap-6 mb-8">
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
        <span className="text-primary font-display font-bold">{phase}</span>
      </div>
      <div>
        <h3 className="text-xl font-display font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-2xl">{description}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

const CardBase = ({ icon, title, desc, borderClass, bgClass, textClass, extra }: any) => (
  <div className={`p-5 bg-card border border-border rounded-lg hover:${borderClass} transition-colors`}>
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-md ${bgClass} ${textClass}`}>{icon}</div>
      <span className="font-semibold text-foreground">{title}</span>
    </div>
    {extra && <div className="text-xs text-primary font-medium mb-2">{extra}</div>}
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

// Specific Card Types with restored styling references
const DataStreamCard = ({ icon, title, description }: any) => (
  <CardBase icon={icon} title={title} desc={description} borderClass="border-primary/30" bgClass="bg-primary/10" textClass="text-primary" />
);

const AnalysisCard = ({ icon, title, input, function: func }: any) => (
  <CardBase 
    icon={icon} title={title} extra={`Input: ${input}`} desc={func}
    borderClass="border-accent/30" bgClass="bg-accent/10" textClass="text-accent" 
  />
);

const FusionCard = ({ icon, title, description }: any) => (
  <CardBase icon={icon} title={title} desc={description} borderClass="border-primary/30" bgClass="bg-primary/10" textClass="text-primary" />
);

const DashboardCard = ({ icon, title, description }: any) => (
  <CardBase icon={icon} title={title} desc={description} borderClass="border-emerald-success/30" bgClass="bg-emerald-success/10" textClass="text-emerald-success" />
);

const DeploymentCard = ({ icon, title, description }: any) => (
  <CardBase icon={icon} title={title} desc={description} borderClass="border-alert-orange/30" bgClass="bg-alert-orange/10" textClass="text-alert-orange" />
);

export default LandingPage;