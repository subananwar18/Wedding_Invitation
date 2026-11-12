fetch("https://wedding-invitation-flax-zeta-73.vercel.app/")
  .then((r) => r.text())
  .then((t) => {
    const og = t.match(/property="og:title"\s+content="([^"]+)"/);
    const title = t.match(/<title>([^<]+)</);
    console.log("og:", og ? og[1] : "missing");
    console.log("title:", title ? title[1] : "missing");
  });
