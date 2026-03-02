"""
Memory & GC Profiling Toolkit

Production-grade memory analysis for detecting:
- Slow memory leaks over time
- Object retention patterns
- GC pressure and pause times
- Per-session memory footprint
- Cache growth patterns

Usage:
    # Start memory profiling in background
    from app.qa.memory_profiler import start_memory_profiler, get_memory_report
    
    start_memory_profiler(interval_sec=60)
    
    # Later, get report
    report = get_memory_report()

CLI:
    python -m app.qa.memory_profiler --duration 300 --interval 30

Key Metrics:
    - RSS (Resident Set Size): Actual physical memory
    - VMS (Virtual Memory Size): Total virtual address space
    - Object counts by type
    - GC generation stats
    - Top memory consumers
"""

import asyncio
import gc
import sys
import os
import time
import json
import argparse
import logging
import tracemalloc
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from collections import defaultdict
import threading

logger = logging.getLogger("memory_profiler")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


@dataclass
class MemorySnapshot:
    """Single point-in-time memory snapshot"""
    timestamp: float
    rss_mb: float
    vms_mb: float
    gc_counts: Tuple[int, int, int]  # Gen0, Gen1, Gen2
    object_counts: Dict[str, int] = field(default_factory=dict)
    top_allocations: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "timestamp_iso": datetime.fromtimestamp(self.timestamp).isoformat(),
            "rss_mb": round(self.rss_mb, 2),
            "vms_mb": round(self.vms_mb, 2),
            "gc": {
                "gen0": self.gc_counts[0],
                "gen1": self.gc_counts[1],
                "gen2": self.gc_counts[2],
            },
            "object_counts": self.object_counts,
            "top_allocations": self.top_allocations,
        }


@dataclass
class MemoryReport:
    """Complete memory profiling report"""
    start_time: float
    end_time: float
    snapshots: List[MemorySnapshot] = field(default_factory=list)
    gc_collections: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        if not self.snapshots:
            return {"error": "No snapshots collected"}
        
        rss_values = [s.rss_mb for s in self.snapshots]
        vms_values = [s.vms_mb for s in self.snapshots]
        
        # Calculate growth rates
        duration_sec = self.snapshots[-1].timestamp - self.snapshots[0].timestamp
        rss_growth = rss_values[-1] - rss_values[0]
        rss_growth_rate = rss_growth / (duration_sec / 3600) if duration_sec > 0 else 0
        
        return {
            "duration_sec": round(self.end_time - self.start_time, 1),
            "snapshot_count": len(self.snapshots),
            
            "memory": {
                "rss_mb": {
                    "start": round(rss_values[0], 2),
                    "end": round(rss_values[-1], 2),
                    "min": round(min(rss_values), 2),
                    "max": round(max(rss_values), 2),
                    "growth": round(rss_growth, 2),
                    "growth_rate_per_hour": round(rss_growth_rate, 2),
                },
                "vms_mb": {
                    "start": round(vms_values[0], 2),
                    "end": round(vms_values[-1], 2),
                    "max": round(max(vms_values), 2),
                },
            },
            
            "gc": {
                "total_collections": sum(s.gc_counts[2] for s in self.snapshots),
                "collection_events": self.gc_collections[-10:],  # Last 10
            },
            
            "object_growth": self._compute_object_growth(),
            
            "leak_analysis": self._analyze_leaks(),
            
            "snapshots": [s.to_dict() for s in self.snapshots[-5:]],  # Last 5
        }
    
    def _compute_object_growth(self) -> Dict[str, Any]:
        """Compute object count growth over profiling period"""
        if len(self.snapshots) < 2:
            return {}
        
        first = self.snapshots[0].object_counts
        last = self.snapshots[-1].object_counts
        
        growth = {}
        for obj_type in set(first.keys()) | set(last.keys()):
            start_count = first.get(obj_type, 0)
            end_count = last.get(obj_type, 0)
            delta = end_count - start_count
            if abs(delta) > 10:  # Only significant changes
                growth[obj_type] = {
                    "start": start_count,
                    "end": end_count,
                    "delta": delta,
                    "growth_pct": round(delta / max(1, start_count) * 100, 1),
                }
        
        # Sort by delta descending
        return dict(sorted(growth.items(), key=lambda x: -x[1]["delta"])[:10])
    
    def _analyze_leaks(self) -> Dict[str, Any]:
        """Analyze potential memory leaks"""
        if len(self.snapshots) < 3:
            return {"status": "insufficient_data"}
        
        rss_values = [s.rss_mb for s in self.snapshots]
        duration_sec = self.snapshots[-1].timestamp - self.snapshots[0].timestamp
        
        # Check for consistent growth
        growth_trend = []
        for i in range(1, len(rss_values)):
            growth_trend.append(rss_values[i] > rss_values[i-1])
        
        consistent_growth_pct = sum(growth_trend) / len(growth_trend) * 100
        total_growth = rss_values[-1] - rss_values[0]
        growth_rate_mb_per_min = total_growth / (duration_sec / 60) if duration_sec > 0 else 0
        
        # Determine leak likelihood
        leak_likelihood = "LOW"
        leak_reasons = []
        
        if consistent_growth_pct > 80:
            leak_likelihood = "HIGH"
            leak_reasons.append(f"Memory consistently growing ({consistent_growth_pct:.0f}% of intervals)")
        elif consistent_growth_pct > 60:
            leak_likelihood = "MEDIUM"
            leak_reasons.append(f"Memory frequently growing ({consistent_growth_pct:.0f}% of intervals)")
        
        if growth_rate_mb_per_min > 1.0:
            leak_likelihood = "HIGH"
            leak_reasons.append(f"Growth rate is high ({growth_rate_mb_per_min:.2f} MB/min)")
        elif growth_rate_mb_per_min > 0.5:
            if leak_likelihood == "LOW":
                leak_likelihood = "MEDIUM"
            leak_reasons.append(f"Growth rate is elevated ({growth_rate_mb_per_min:.2f} MB/min)")
        
        # Check object growth patterns
        obj_growth = self._compute_object_growth()
        suspicious_types = []
        for obj_type, stats in obj_growth.items():
            if stats["growth_pct"] > 100 and stats["delta"] > 100:
                suspicious_types.append(obj_type)
        
        if suspicious_types:
            leak_reasons.append(f"Suspicious object growth: {', '.join(suspicious_types[:3])}")
        
        return {
            "likelihood": leak_likelihood,
            "consistent_growth_pct": round(consistent_growth_pct, 1),
            "growth_rate_mb_per_min": round(growth_rate_mb_per_min, 3),
            "total_growth_mb": round(total_growth, 2),
            "reasons": leak_reasons,
            "suspicious_types": suspicious_types[:5],
            "recommendations": self._leak_recommendations(leak_likelihood, suspicious_types),
        }
    
    def _leak_recommendations(self, likelihood: str, suspicious_types: List[str]) -> List[str]:
        """Generate recommendations based on leak analysis"""
        recs = []
        
        if likelihood == "HIGH":
            recs.append("CRITICAL: Memory leak likely. Profile with tracemalloc immediately.")
            recs.append("Check for unbounded caches or event listeners not being cleaned up.")
        elif likelihood == "MEDIUM":
            recs.append("Monitor memory over longer period to confirm trend.")
            recs.append("Review session cleanup code for proper resource release.")
        
        if "dict" in str(suspicious_types):
            recs.append("Check dictionary caches for size limits (LRU eviction).")
        if "list" in str(suspicious_types):
            recs.append("Check list buffers for maximum size enforcement.")
        if "asyncio" in str(suspicious_types).lower():
            recs.append("Check for uncancelled asyncio tasks or dangling coroutines.")
        if "websocket" in str(suspicious_types).lower():
            recs.append("Verify WebSocket connections are properly closed on disconnect.")
        
        return recs


class MemoryProfiler:
    """
    Continuous memory profiler with tracemalloc integration.
    """
    
    def __init__(self, interval_sec: float = 60):
        self.interval_sec = interval_sec
        self.report = MemoryReport(start_time=time.time(), end_time=0)
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._gc_callback_registered = False
        
        # Track types to monitor
        self._tracked_types = [
            "dict", "list", "tuple", "set", "frozenset",
            "str", "bytes", "bytearray",
            "function", "method", "cell",
            "frame", "code", "module",
        ]
    
    def start(self):
        """Start memory profiling"""
        if self._running:
            return
        
        self._running = True
        self.report.start_time = time.time()
        
        # Start tracemalloc
        if not tracemalloc.is_tracing():
            tracemalloc.start(10)  # 10 frames deep
        
        # Register GC callback
        if not self._gc_callback_registered:
            gc.callbacks.append(self._gc_callback)
            self._gc_callback_registered = True
        
        logger.info("Memory profiler started (interval: %ds)", self.interval_sec)
    
    def stop(self):
        """Stop memory profiling"""
        self._running = False
        self.report.end_time = time.time()
        
        if self._gc_callback_registered:
            try:
                gc.callbacks.remove(self._gc_callback)
            except ValueError:
                pass
            self._gc_callback_registered = False
        
        logger.info("Memory profiler stopped")
    
    async def run_async(self, duration_sec: float = 0):
        """Run profiler asynchronously"""
        self.start()
        
        end_time = time.time() + duration_sec if duration_sec > 0 else float('inf')
        
        try:
            while self._running and time.time() < end_time:
                snapshot = self._take_snapshot()
                self.report.snapshots.append(snapshot)
                
                logger.info("Memory snapshot: RSS=%.1fMB VMS=%.1fMB GC=%s",
                           snapshot.rss_mb, snapshot.vms_mb, snapshot.gc_counts)
                
                await asyncio.sleep(self.interval_sec)
        finally:
            self.stop()
        
        return self.get_report()
    
    def _take_snapshot(self) -> MemorySnapshot:
        """Take a memory snapshot"""
        # Get memory info
        rss_mb, vms_mb = self._get_memory_mb()
        
        # Get GC stats
        gc_counts = gc.get_count()
        
        # Count objects by type
        object_counts = self._count_objects()
        
        # Get top allocations from tracemalloc
        top_allocs = self._get_top_allocations()
        
        return MemorySnapshot(
            timestamp=time.time(),
            rss_mb=rss_mb,
            vms_mb=vms_mb,
            gc_counts=gc_counts,
            object_counts=object_counts,
            top_allocations=top_allocs,
        )
    
    def _get_memory_mb(self) -> Tuple[float, float]:
        """Get RSS and VMS in MB"""
        try:
            import psutil
            proc = psutil.Process()
            mem = proc.memory_info()
            return mem.rss / (1024 * 1024), mem.vms / (1024 * 1024)
        except ImportError:
            return 0.0, 0.0
    
    def _count_objects(self) -> Dict[str, int]:
        """Count objects by type"""
        counts = defaultdict(int)
        
        for obj in gc.get_objects():
            type_name = type(obj).__name__
            counts[type_name] += 1
        
        # Filter to tracked types and top others
        result = {}
        for t in self._tracked_types:
            if t in counts:
                result[t] = counts[t]
        
        # Add top 5 other types
        other_types = sorted(
            [(k, v) for k, v in counts.items() if k not in result],
            key=lambda x: -x[1]
        )[:5]
        for k, v in other_types:
            result[k] = v
        
        return result
    
    def _get_top_allocations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top memory allocations from tracemalloc"""
        if not tracemalloc.is_tracing():
            return []
        
        snapshot = tracemalloc.take_snapshot()
        stats = snapshot.statistics('lineno')
        
        result = []
        for stat in stats[:limit]:
            result.append({
                "file": str(stat.traceback),
                "size_kb": round(stat.size / 1024, 1),
                "count": stat.count,
            })
        
        return result
    
    def _gc_callback(self, phase: str, info: Dict[str, Any]):
        """GC callback to track collections"""
        if phase == "stop":
            self.report.gc_collections.append({
                "timestamp": time.time(),
                "generation": info.get("generation", -1),
                "collected": info.get("collected", 0),
                "uncollectable": info.get("uncollectable", 0),
            })
            
            # Keep last 100 collections
            if len(self.report.gc_collections) > 100:
                self.report.gc_collections.pop(0)
    
    def get_report(self) -> MemoryReport:
        """Get current memory report"""
        if self.report.end_time == 0:
            self.report.end_time = time.time()
        return self.report


# Global profiler instance
_profiler: Optional[MemoryProfiler] = None
_profiler_task: Optional[asyncio.Task] = None


def start_memory_profiler(interval_sec: float = 60):
    """Start global memory profiler"""
    global _profiler
    if _profiler is None:
        _profiler = MemoryProfiler(interval_sec=interval_sec)
    _profiler.start()


def stop_memory_profiler():
    """Stop global memory profiler"""
    global _profiler
    if _profiler:
        _profiler.stop()


def get_memory_report() -> Dict[str, Any]:
    """Get current memory report"""
    global _profiler
    if _profiler is None:
        return {"error": "Profiler not started"}
    return _profiler.get_report().to_dict()


async def run_memory_profiler(duration_sec: float, interval_sec: float) -> Dict[str, Any]:
    """Run memory profiler for specified duration"""
    profiler = MemoryProfiler(interval_sec=interval_sec)
    report = await profiler.run_async(duration_sec=duration_sec)
    return report.to_dict()


def print_report(report: Dict[str, Any]):
    """Print formatted memory report"""
    print("\n" + "=" * 70)
    print("MEMORY PROFILING REPORT")
    print("=" * 70)
    
    if "error" in report:
        print(f"Error: {report['error']}")
        return
    
    print(f"\nDuration: {report['duration_sec']}s")
    print(f"Snapshots: {report['snapshot_count']}")
    
    mem = report['memory']['rss_mb']
    print("\n--- RSS MEMORY ---")
    print(f"  Start:     {mem['start']} MB")
    print(f"  End:       {mem['end']} MB")
    print(f"  Max:       {mem['max']} MB")
    print(f"  Growth:    {mem['growth']} MB")
    print(f"  Rate:      {mem['growth_rate_per_hour']} MB/hour")
    
    print("\n--- LEAK ANALYSIS ---")
    leak = report['leak_analysis']
    likelihood_color = {
        "LOW": "\033[92m",
        "MEDIUM": "\033[93m",
        "HIGH": "\033[91m",
    }.get(leak['likelihood'], "")
    reset = "\033[0m"
    
    print(f"  Likelihood:    {likelihood_color}{leak['likelihood']}{reset}")
    print(f"  Growth Trend:  {leak['consistent_growth_pct']}% consistent")
    print(f"  Growth Rate:   {leak['growth_rate_mb_per_min']} MB/min")
    
    if leak['reasons']:
        print("  Reasons:")
        for reason in leak['reasons']:
            print(f"    ⚠ {reason}")
    
    if leak['recommendations']:
        print("  Recommendations:")
        for rec in leak['recommendations']:
            print(f"    → {rec}")
    
    if report['object_growth']:
        print("\n--- OBJECT GROWTH (Top 5) ---")
        for obj_type, stats in list(report['object_growth'].items())[:5]:
            print(f"  {obj_type}: {stats['start']} → {stats['end']} (+{stats['delta']})")
    
    print("\n" + "=" * 70)


async def main():
    parser = argparse.ArgumentParser(description="Memory & GC Profiler")
    parser.add_argument("--duration", type=int, default=300,
                       help="Profiling duration in seconds")
    parser.add_argument("--interval", type=int, default=30,
                       help="Snapshot interval in seconds")
    parser.add_argument("--output", default=None,
                       help="Output JSON file path")
    
    args = parser.parse_args()
    
    logger.info("Starting memory profiler for %ds (interval: %ds)",
               args.duration, args.interval)
    
    report = await run_memory_profiler(
        duration_sec=args.duration,
        interval_sec=args.interval,
    )
    
    print_report(report)
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
