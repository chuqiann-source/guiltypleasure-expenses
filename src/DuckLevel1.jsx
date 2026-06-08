function DuckLevel1() {
  return (
    <svg
      className="duck-svg"
      width="1024"
      height="1024"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="title desc"
    >
      <title id="title">
        Minecraft Style Baby Duck Mascot - Level 1
      </title>

      <desc id="desc">
        True vector SVG baby duck mascot for finance app progression.
      </desc>

      {/* BODY */}
      <g id="body">
        <rect
          x="382"
          y="518"
          width="260"
          height="242"
          fill="#F4E29A"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="382,518 426,482 686,482 642,518"
          fill="#F8EFC8"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="642,518 686,482 686,724 642,760"
          fill="#D8C36E"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <rect x="426" y="562" width="32" height="32" fill="#FFF0B5" />
        <rect x="498" y="542" width="32" height="32" fill="#E4CC76" />
        <rect x="566" y="618" width="32" height="32" fill="#FFF0B5" />
        <rect x="456" y="686" width="32" height="32" fill="#D4B765" />
      </g>

      {/* LEFT WING */}
      <g id="left-wing">
        <rect
          x="314"
          y="552"
          width="68"
          height="118"
          fill="#F4E29A"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="314,552 346,526 414,526 382,552"
          fill="#F8EFC8"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="382,552 414,526 414,644 382,670"
          fill="#D8C36E"
          stroke="#5f452c"
          strokeWidth="8"
        />
      </g>

      {/* RIGHT WING */}
      <g id="right-wing">
        <rect
          x="642"
          y="552"
          width="68"
          height="118"
          fill="#F4E29A"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="642,552 674,526 742,526 710,552"
          fill="#F8EFC8"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="710,552 742,526 742,644 710,670"
          fill="#D8C36E"
          stroke="#5f452c"
          strokeWidth="8"
        />
      </g>

      {/* HEAD */}
      <g id="head">
        <rect
          x="304"
          y="230"
          width="416"
          height="302"
          fill="#F8EFC8"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="304,230 354,188 770,188 720,230"
          fill="#FFF7DA"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="720,230 770,188 770,490 720,532"
          fill="#E7D7A5"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <rect x="352" y="270" width="32" height="32" fill="#FFF8DD" />
        <rect x="424" y="252" width="32" height="32" fill="#EAD9A8" />
        <rect x="508" y="278" width="32" height="32" fill="#FFF8DD" />
        <rect x="604" y="258" width="32" height="32" fill="#EAD9A8" />
        <rect x="644" y="402" width="32" height="32" fill="#FFF8DD" />
        <rect x="356" y="420" width="32" height="32" fill="#EAD9A8" />

        {/* LEFT EYE */}
        <g id="left-eye">
          <rect
            x="374"
            y="348"
            width="76"
            height="88"
            fill="#2B1A12"
            stroke="#5f452c"
            strokeWidth="8"
          />
          <rect
            x="414"
            y="360"
            width="18"
            height="18"
            fill="#FFFFFF"
          />
        </g>

        {/* RIGHT EYE */}
        <g id="right-eye">
          <rect
            x="574"
            y="348"
            width="76"
            height="88"
            fill="#2B1A12"
            stroke="#5f452c"
            strokeWidth="8"
          />
          <rect
            x="614"
            y="360"
            width="18"
            height="18"
            fill="#FFFFFF"
          />
        </g>
      </g>

      {/* BEAK */}
      <g id="beak">
        <rect
          x="434"
          y="416"
          width="156"
          height="56"
          fill="#E79A3B"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="434,416 462,392 618,392 590,416"
          fill="#F0A94B"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <polygon
          points="590,416 618,392 618,448 590,472"
          fill="#B76523"
          stroke="#5f452c"
          strokeWidth="8"
        />

        <rect x="474" y="432" width="14" height="14" fill="#5A2D17" />
        <rect x="536" y="432" width="14" height="14" fill="#5A2D17" />
        <rect x="472" y="456" width="80" height="8" fill="#7A381A" />
      </g>

      {/* LEFT FOOT */}
      <g id="left-foot">
        <rect
          x="386"
          y="748"
          width="88"
          height="44"
          fill="#8A5A34"
          stroke="#5f452c"
          strokeWidth="8"
        />
      </g>

      {/* RIGHT FOOT */}
      <g id="right-foot">
        <rect
          x="550"
          y="748"
          width="88"
          height="44"
          fill="#8A5A34"
          stroke="#5f452c"
          strokeWidth="8"
        />
      </g>

      <g id="accessory"></g>
    </svg>
  );
}

export default DuckLevel1;
