"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/landing"); // redirige la racine vers la landing page
  }, []);

  return null;
}
