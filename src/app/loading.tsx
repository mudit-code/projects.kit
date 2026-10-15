import { KitScreenLoader } from "@/components/KitScreenLoader";

export default function Loading() {
  return (
    <div 
      aria-label="Loading content"
      className="fixed inset-0 z-[99998] flex items-center justify-center bg-[#F6F5F2]"
    >
      <KitScreenLoader
        fullScreen={false}
        showText={true}
        loop={true}
        duration={1.25}
        transparent={true}
      />
    </div>
  );
}
