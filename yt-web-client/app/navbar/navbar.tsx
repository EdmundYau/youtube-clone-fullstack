"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./navbar.module.css";
import SignIn from "./sign-in";

import { useState } from "react";
import { useEffect } from "react";
import { onAuthStateChangedHelper } from "../firebase/firebase";
import { User } from "firebase/auth";
import Upload from "./upload";

export default function Navbar() {
  //init user state
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper((user) => {
      setUser(user);
    });
    //cleanup unsubscription unmount
    return () => unsubscribe();
  });

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.nav}>
        <Image
          width={90}
          height={20}
          src="/youtube-logo.svg"
          alt="Youtube Logo"
        ></Image>
      </Link>
      {user && <Upload></Upload>}
      <SignIn user={user} />
    </nav>
  );
}
