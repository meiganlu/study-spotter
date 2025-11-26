import Image from "next/image";

export default function FeatureCard({ title, icon }: { title: string; icon: string; }) {
  return (
    <div className="group">
      <div className="p-8 rounded-2xl backdrop-blur-md">
        <div className="flex justify-center mb-2 relative">
          <div className="p-4 backdrop-blur-md">
            <Image src={icon} alt={title} width={60} height={60} className="invert" />
          </div>
          <span className="absolute bottom-[80%] left-1/2 -translate-x-1/2 text-[10px] text-gray-300 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            Icon from Flaticon
          </span>
        </div>
        <h3 className="font-light text-[#fffdf9] text-md text-center mb-4 leading-snug">
          {title}
        </h3>
      </div>
    </div>
  );
}
