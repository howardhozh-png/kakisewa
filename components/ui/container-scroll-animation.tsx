"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ContainerScroll({
  titleComponent,
  children,
}: {
  titleComponent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[60rem] items-start justify-center p-2 md:h-[80rem] md:p-20"
    >
      <div className="relative w-full" style={{ perspective: "1000px" }}>
        {titleComponent && (
          <motion.div style={{ translateY }} className="mx-auto mb-8 max-w-5xl text-center">
            {titleComponent}
          </motion.div>
        )}
        <motion.div
          style={{
            rotateX: rotate,
            scale,
            boxShadow:
              "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
          }}
          className="mx-auto h-[30rem] w-full max-w-5xl overflow-hidden rounded-[30px] border-4 border-[#6C6C6C] bg-[#222222] p-2 shadow-2xl md:h-[44rem] md:p-4"
        >
          <div className="h-full w-full overflow-hidden rounded-2xl">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
