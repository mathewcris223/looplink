import AjeLogo, { AjeIcon } from "@/components/ui/AjeLogo";

const LogoPreview = () => (
  <div className="min-h-screen p-8 space-y-6 max-w-3xl mx-auto bg-gray-100">
    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">Aje — Brand Identity</p>

    {/* Primary — large hero on white */}
    <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-white shadow-sm border gap-2">
      <AjeLogo variant="dark" size={96} showTagline />
    </div>

    {/* 3 variants side by side */}
    <div className="grid grid-cols-3 gap-4">
      {/* Dark navy bg */}
      <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-2" style={{ background: "#0D1B3E" }}>
        <AjeLogo variant="light" size={40} showTagline />
      </div>
      {/* White */}
      <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-white border gap-2">
        <AjeLogo variant="dark" size={40} showTagline />
      </div>
      {/* Dark teal/navy */}
      <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-2" style={{ background: "#0D2137" }}>
        <AjeLogo variant="light" size={40} showTagline />
      </div>
    </div>

    {/* App Icons */}
    <div className="p-8 rounded-3xl bg-white shadow-sm border">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">App Icon Options</p>
      <div className="flex items-center gap-5 flex-wrap">
        <AjeIcon size={80} variant="dark" />
        <AjeIcon size={64} variant="blue" />
        <AjeIcon size={56} variant="dark" />
        <AjeIcon size={48} variant="blue" />
        <AjeIcon size={40} variant="dark" />
        <AjeIcon size={32} variant="blue" />
      </div>
    </div>

    {/* Logo mark / symbol */}
    <div className="p-8 rounded-3xl bg-white shadow-sm border">
      <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">Logo Mark / Symbol</p>
      <div className="flex items-center gap-8">
        {/* Aj monogram */}
        <div className="flex flex-col items-center gap-2">
          <div style={{
            width: 80, height: 80, borderRadius: 16,
            border: "2px solid #0D1B3E",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <AjeLogo variant="dark" size={36} />
          </div>
          <span className="text-xs text-gray-400">Outlined</span>
        </div>
        {/* Circle mark */}
        <div className="flex flex-col items-center gap-2">
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "2px solid #0D1B3E",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <AjeLogo variant="dark" size={32} />
          </div>
          <span className="text-xs text-gray-400">Circle</span>
        </div>
        {/* Filled */}
        <div className="flex flex-col items-center gap-2">
          <AjeIcon size={80} variant="dark" />
          <span className="text-xs text-gray-400">Filled</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <AjeIcon size={80} variant="blue" />
          <span className="text-xs text-gray-400">Blue</span>
        </div>
      </div>
    </div>

    {/* Navbar simulation */}
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white shadow-sm border">
      <AjeIcon size={32} variant="dark" />
      <AjeLogo variant="dark" size={24} />
    </div>
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl" style={{ background: "#0D1B3E" }}>
      <AjeIcon size={32} variant="blue" />
      <AjeLogo variant="light" size={24} />
    </div>
  </div>
);

export default LogoPreview;
