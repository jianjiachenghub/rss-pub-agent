import { useEffect, useState, useRef } from "react";
import { streamMarkdown } from "@/lib/markdown";

interface StreamContentProps {
  content: string;
  className?: string;
}

// 流式渲染 Markdown 内容
export function StreamContent({ content, className }: StreamContentProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDisplayedContent("");

    async function stream() {
      for await (const chunk of streamMarkdown(content)) {
        if (cancelled) break;
        setDisplayedContent(prev => prev + chunk);
        
        // 自动滚动到底部
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }
    }

    stream();

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: displayedContent }}
    />
  );
}

// 打字机效果组件
interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 30, className, onComplete }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete]);

  // 重置当 text 改变时
  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  return <span className={className}>{displayedText}</span>;
}

// 渐进式显示子元素
interface ProgressiveRevealProps {
  children: React.ReactNode[];
  delay?: number;
  className?: string;
}

export function ProgressiveReveal({ children, delay = 100, className }: ProgressiveRevealProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < children.length) {
      const timeout = setTimeout(() => {
        setVisibleCount(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [visibleCount, children.length, delay]);

  // 重置
  useEffect(() => {
    setVisibleCount(0);
  }, [children]);

  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`transition-all duration-500 ${
            index < visibleCount
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
