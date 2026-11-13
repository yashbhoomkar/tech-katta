// Practice, LeetCode style (tech-katta-context/21-PROBLEM-EXPERIENCE-LEETCODE-STYLE.md): /dashboard/practice/ lists the
// problems, /dashboard/practice/<slug>/ opens one. Loaded only when one of those pages opens (shell.jsx).
import React, { useEffect, useState } from "react";
import "./practice.css";
import { listProblems } from "./client.js";
import { useAccount } from "../accountui.jsx";
import ProblemList from "./list.jsx";
import ProblemPage from "./page.jsx";

export default function Practice({ slug, t }) {
  const a = useAccount(), [list, setList] = useState(null), [streak, setStreak] = useState(null), [err, setErr] = useState(null), [n, setN] = useState(0);
  useEffect(() => { setErr(null); listProblems().then((d) => { setList(d.problems); setStreak(Number.isInteger(d.streak) ? d.streak : null); }, setErr); }, [a.user, n, slug]);
  return slug ? <ProblemPage slug={slug} list={list} t={t}/> : <ProblemList list={list} streak={streak} error={err} retry={() => setN((x) => x + 1)}/>;
}
