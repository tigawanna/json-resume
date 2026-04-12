export function TailwindIndicator() {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="bg-base-100 fixed top-[1.5%] left-[50%] z-50 flex size-8 items-center justify-center font-bold">
      <div className="block sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden lg:hidden xl:hidden 2xl:hidden">sm</div>
      <div className="hidden md:block lg:hidden xl:hidden 2xl:hidden">md</div>
      <div className="hidden lg:block xl:hidden 2xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
}
export function TailwindContainerIndicator() {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="flex gap-2">
      <div className="hidden @sm:flex @md:hidden">SM</div>
      <div className="hidden @sm:hidden @md:flex @lg:hidden">MD</div>
      <div className="hidden @md:hidden @lg:flex @xl:hidden">LG</div>
      <div className="hidden @md:hidden @lg:hidden @xl:flex">XL</div>
      <div className="hidden @md:hidden @lg:hidden @xl:hidden @2xl:flex">2XL</div>
    </div>
  );
}
