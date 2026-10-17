import { useRoute } from "./router";
import Apply from "./pages/Apply";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Me from "./pages/Me";
import Profile from "./pages/Profile";
import Passport from "./pages/Passport";
import RequestDetail from "./pages/RequestDetail";
import Requests from "./pages/Requests";
import Verify from "./pages/Verify";
import { Tabs } from "./ui";

export default function App() {
  const r = useRoute();
  let page;
  if (r === "/signin") page = <Auth mode="signin" />;
  else if (r === "/signup") page = <Auth mode="signup" />;
  else if (r === "/verify") page = <Verify />;
  else if (r.startsWith("/apply/")) page = <Apply key={r} lineKey={r.slice(7)} />;
  else if (r === "/requests") page = <Requests />;
  else if (r.startsWith("/requests/")) page = <RequestDetail key={r} id={r.slice(10)} />;
  else if (r === "/passport") page = <Passport />;
  else if (r === "/profile") page = <Profile />;
  else if (r === "/me") page = <Me />;
  else page = <Home />;
  const bare = r === "/signin" || r === "/signup" || r === "/verify";
  return <div className="app">{page}{!bare && <Tabs route={r} />}</div>;
}
