import { useCallback, useEffect, useState } from "react";
import ProfileStage from "../components/ProfileStage";
import Sheet from "../components/Sheet";
import { IconChat, IconCube, IconLogin, IconLogout, IconPlus, IconUserPlus } from "../components/Icons";
import ChatFeed from "../components/ChatFeed";
import ChatComposer from "../components/ChatComposer";
import { useChat } from "../chat/useChat";
import { useSession } from "../auth/useSession";
import AuthForm from "../components/AuthForm";
import AdminPanel from "../components/AdminPanel";
import { wakeServer } from "../api/accounts";
import { clearAdminAccess } from "../api/accounts";
import { WalletBalances, CouponForm, RechargeForm } from "../components/WalletForms";
import { IconVoucher } from "../components/Icons";
import "../styles/profile.css";
import "../styles/chat.css";

const CHAT_KEY = "maf-chat-on";
const readChatPref = () => {
  try {
    return localStorage.getItem(CHAT_KEY) === "1";
  } catch {
    return false;
  }
};

// Nom affiche sur la page (une ligne par element)
const APP_NAME = ["MARV", "GAME"];

export default function ProfilePage({ onOpenStudio }) {
  const { session, login, register, logout, updateUser } = useSession();
  const [sheet, setSheet] = useState(null); // login | signup | account | recharge
  const [chatOn, setChatOn] = useState(readChatPref);
  const chat = useChat(chatOn);
  const toggleChat = () => {
    setChatOn((on) => {
      try {
        localStorage.setItem(CHAT_KEY, on ? "0" : "1");
      } catch {
        /* stockage facultatif */
      }
      return !on;
    });
  };
  const close = useCallback(() => {
    if (sheet === "admin") clearAdminAccess();
    setSheet(null);
  }, [sheet]);
  useEffect(() => {
    wakeServer();
  }, []);


  return (
    <>
      <main className="profile">
        <div className="profile__bar">
          <WalletBalances user={session} />
        </div>

        <section className="profile__stage" aria-label="Personnage">
          <ProfileStage />
          <h1 className="profile__title title-tech">
            {APP_NAME[0]}
            <span>{APP_NAME[1]}</span>
          </h1>
        </section>

        {chatOn && (
          <>
            <ChatFeed messages={chat.messages} myId={session?.id} />
            <ChatComposer session={session} onSend={chat.send} onNeedLogin={() => setSheet("login")} />
          </>
        )}

        <div className="profile__actions">
          {session ? (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("coupons")}
              >
                <IconVoucher />
                Coupons
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("recharge")}
              >
                <IconPlus />
                Recharger
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--glass profile__btn"
                onClick={() => setSheet("login")}
              >
                <IconLogin />
                Login
              </button>
              <button
                type="button"
                className="btn btn--primary profile__btn"
                onClick={() => setSheet("signup")}
              >
                <IconUserPlus />
                Sign Up
              </button>
            </>
          )}
        </div>

        <section className="profile__panel" aria-label="Menu">
          {!session && (
            <p className="profile__hint">
              Connecte-toi avec ton pseudo et ton code pour retrouver ton compte.
            </p>
          )}
          <div className="menu-grid">
            <button type="button" className="menu-btn" onClick={onOpenStudio}>
              <IconCube />
              <span>Studio 3D</span>
            </button>
            <button
              type="button"
              className={`menu-btn${chatOn ? " is-on" : ""}`}
              aria-pressed={chatOn}
              onClick={toggleChat}
            >
              <IconChat />
              <span>Chat</span>
            </button>
            {session && (
              <button
                type="button"
                className="menu-btn menu-btn--danger"
                onClick={() => setSheet("logout")}
              >
                <IconLogout />
                <span>Deconnexion</span>
              </button>
            )}
          </div>
        </section>
      </main>

      <Sheet open={sheet === "login"} title="Login" onClose={close}>
        <AuthForm
          mode="login"
          onSubmit={async (pseudo, code) => {
            await login(pseudo, code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "signup"} title="Sign Up" onClose={close}>
        <AuthForm
          mode="signup"
          onSubmit={async (pseudo, code) => {
            await register(pseudo, code);
            close();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "account"} title="Mon compte" onClose={close}>
        {session && (
          <>
            <p className="sheet__text">
              Pseudo : <strong>{session.pseudo}</strong>
              <br />
              Solde : <strong>{session.balance}</strong>
            </p>
            <button
              type="button"
              className="btn btn--glass btn--block"
              onClick={() => setSheet("logout")}
            >
              Se deconnecter
            </button>
          </>
        )}
      </Sheet>

      <Sheet open={sheet === "logout"} title="Deconnexion" onClose={close}>
        <p className="sheet__text">
          Tu veux vraiment te deconnecter de ton compte ? Pour te reconnecter, il faudra ton pseudo et ton code a 10 chiffres.
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn btn--glass" onClick={close}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              logout();
              close();
            }}
          >
            Oui, me deconnecter
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === "coupons"} title="Coupons" onClose={close}>
        {session && <CouponForm onUser={updateUser} onAdmin={() => setSheet("admin")} />}
      </Sheet>
      {sheet === "admin" && session && <AdminPanel key={session.id} onClose={close} />}
      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>
        {session && <RechargeForm user={session} onUser={updateUser} />}
      </Sheet>
    </>
  );
}
