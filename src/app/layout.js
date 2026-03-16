import "./globals.css";

export const metadata = {
  title: "Kid Quest",
  description: "A tiny learning tracker for reading and math built with Next.js and MongoDB.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
