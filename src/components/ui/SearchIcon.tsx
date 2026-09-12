import React from 'react';

export interface SearchIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Search icon matching the Google Material Symbols outlined glyph provided in /external-items/
 */
export function SearchIcon({
  className = "w-5 h-5",
  size,
  fill = "currentColor",
  ...props
}: SearchIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill={fill}
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
    </svg>
  );
}

export const Search = SearchIcon;
export default SearchIcon;
