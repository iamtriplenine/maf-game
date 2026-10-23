import { useCallback, useEffect, useMemo, useState } from "react";
import ProfileStage from "../components/ProfileStage";
import GuidePage from "../components/GuidePage";
import CommunityLinks from "../components/CommunityLinks";
import FootballLeaderboard from "../components/FootballLeaderboard";
import ProfileIdentity from "../components/ProfileIdentity";
import Sheet from "../components/Sheet";
import AccountHistory from "../components/AccountHistory";
import WithdrawalForm from "../components/WithdrawalForm";
import { IconWithdraw, IconHistory } from "../components/Icons";
import { IconChat, IconCube, IconLogin, IconLogout, IconPalette, IconPlus, IconUserPlus } from "../components/Icons";
import ChatFeed from "../components/ChatFeed";
import ChatComposer from "../components/ChatComposer";
import ChatScreen from "../components/ChatScreen";
import { useLongPress } from "../chat/useLongPress";
import { useChat } from "../chat/useChat";
import { useSession } from "../auth/useSession";
import AuthForm from "../components/AuthForm";
import AdminPanel from "../components/AdminPanel";
import OwnerCommissionSummary from "../components/OwnerCommissionSummary";
import { wakeServer, saveSkin } from "../api/accounts";
import { DEFAULT_SKIN, SKINS, validSkin } from "../characters/skins";
import { clearAdminAccess } from "../api/accounts";
import { WalletBalances, CouponForm, RechargeForm } from "../components/WalletForms";
import { IconVoucher } from "../components/Icons";
import "../styles/profile.css";
import "../styles/profile-identity.css";
import "../styles/chat.css";

const CHAT_KEY = "maf-chat-on";
const GUEST_SKIN_KEY = "maf-guest-skin";
const readGuestSkin = () => {
  try { return validSkin(localStorage.getItem(GUEST_SKIN_KEY)); }
  catch { return DEFAULT_SKIN; }
};
const readChatPref = () => {
  try {
    return localStorage.getItem(CHAT_KEY) === "1";
  } catch {
    return false;
  }
};

// Nom affiche sur la page (une ligne par element)
const APP_NAME = ["VIVA", "CENTER"];

export default function ProfilePage({ onOpenStudio }) {
  const { session, login, register, logout, updateUser } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // login | signup | account | recharge
  const [chatOn, setChatOn] = useState(readChatPref);
  const [chatFull, setChatFull] = useState(false); // chat global en plein ecran
  const [guestSkin, setGuestSkin] = useState(readGuestSkin);
  const [skinSaving, setSkinSaving] = useState(false);
  const [skinError, setSkinError] = useState("");
  const [draftSkin, setDraftSkin] = useState(null);
  const selectedSkin = session ? validSkin(session.skin_id) : guestSkin;
  const activeSkin = draftSkin || selectedSkin;
  const activeSkinIndex = useMemo(() => {
    const index = SKINS.findIndex((skin) => skin.id === activeSkin);
    return index >= 0 ? index : 0;
  }, [activeSkin]);
  const openPersonalize = () => {
    setSkinError("");
    setDraftSkin(selectedSkin);
    setSheet("personalize");
  };
  const rotateSkin = (step) => {
    const total = SKINS.length || 1;
    const next = (activeSkinIndex + step + total) % total;
    setDraftSkin(SKINS[next].id);
  };
  const confirmSkin = async () => {
    const id = draftSkin || selectedSkin;
    if (skinSaving || !id || id === selectedSkin) {
      close();
      return;
    }
    setSkinError("");
    setSkinSaving(true);
    try {
      if (!session) {
        setGuestSkin(id);
        try { localStorage.setItem(GUEST_SKIN_KEY, id); } catch { /* facultatif */ }
      } else {
        const user = await saveSkin(id);
        updateUser(user);
      }
      close();
    } catch (error) {
      setSkinError(error.message || "Enregistrement impossible. Reessaie.");
    } finally {
      setSkinSaving(false);
    }
  };
  const chat = useChat(chatOn || chatFull);
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
  // Appui long sur Chat : on ferme tout et on ouvre le chat global en plein ecran
  const chatButton = useLongPress({
    onClick: toggleChat,
    onLong: () => {
      close();
      setChatFull(true);
    },
  });
  const closeChatFull = useCallback(() => setChatFull(false), []);
  useEffect(() => {
    wakeServer();
  }, []);
  useEffect(() => {
    setDraftSkin(null);
    setSkinError("");
    setMoreOpen(false);
  }, [session?.id]);


  return (
    <>
      <main className="profile">
        <div className="profile__bar">
          <WalletBalances user={session} />
          <ProfileIdentity pseudo={session?.pseudo} />
        </div>

        <section className="profile__stage" aria-label="Personnage">
          <ProfileStage skinId={selectedSkin} />
          <h1 className="profile__title title-tech">
            {APP_NAME[0]}
            <span>{APP_NAME[1]}</span>
          </h1>
        </section>

        {chatOn && !chatFull && (
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
          {moreOpen ? (
            <div key="more" className="menu-grid menu-grid--more" aria-label="Options supplémentaires">
              <button type="button" className="menu-btn menu-btn--back" onClick={() => setMoreOpen(false)}>
                <span className="menu-btn__symbol" aria-hidden="true">←</span>
                <span>Retour</span>
              </button>
              <button type="button" className="menu-btn menu-btn--guide" onClick={() => setSheet("guide")}>
                <span className="menu-btn__symbol" aria-hidden="true">?</span>
                <span>Guide</span>
              </button>
              {session?.pseudo === '999' && (
                <button type="button" className="menu-btn menu-btn--community" onClick={() => setSheet("community")}>
                  <span className="menu-btn__symbol" aria-hidden="true">♧</span>
                  <span>Communauté</span>
                </button>
              )}
              <button type="button" className="menu-btn menu-btn--ranking" onClick={() => setSheet("ranking")}>
                <span className="menu-btn__symbol" aria-hidden="true">🏆</span>
                <span>Classement</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => { setMoreOpen(false); onOpenStudio?.(); }}>
                <IconCube />
                <span>Studio 3D</span>
              </button>
              {session && (
                <button type="button" className="menu-btn menu-btn--danger" onClick={() => setSheet("logout")}>
                  <IconLogout />
                  <span>Déconnexion</span>
                </button>
              )}
            </div>
          ) : (
            <div key="main" className="menu-grid menu-grid--main" aria-label="Menu principal">
              <button
                type="button"
                className={`menu-btn${chatOn ? " is-on" : ""}${chatButton.pressing ? " is-pressing" : ""}`}
                aria-pressed={chatOn}
                title="Appui court : afficher les bulles. Appui long : ouvrir le chat"
                {...chatButton.handlers}
              >
                <IconChat />
                <span>Chat</span>
              </button>
              <button
                type="button"
                className="menu-btn"
                onClick={openPersonalize}
              >
                <IconPalette />
                <span>Personnalisation</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => setSheet(session ? "withdrawal" : "login")}>
                <IconWithdraw />
                <span>Retrait</span>
              </button>
              <button type="button" className="menu-btn" onClick={() => setSheet(session ? "history" : "login")}>
                <IconHistory />
                <span>Historique</span>
              </button>
              {session?.pseudo === '999' && (
                <button type="button" className="menu-btn" onClick={() => setSheet('owner-commissions')}>
                  <span aria-hidden="true" style={{fontSize:22}}>◈</span>
                  <span>Mes commissions</span>
                </button>
              )}
              {session?.pseudo !== '999' && (
                <button type="button" className="menu-btn menu-btn--community" onClick={() => setSheet("community")}>
                  <span className="menu-btn__symbol" aria-hidden="true">♧</span>
                  <span>Communauté</span>
                </button>
              )}
              <button type="button" className="menu-btn menu-btn--more" onClick={() => setMoreOpen(true)} aria-label="Plus d'options">
                <span className="menu-btn__symbol" aria-hidden="true">•••</span>
                <span>More</span>
              </button>
            </div>
          )}
        </section>
      </main>

      <Sheet open={sheet === "community"} title="Communauté MAF Game" onClose={close}>
        <CommunityLinks />
      </Sheet>
      <Sheet open={sheet === "ranking"} title="Classement football" onClose={close}>
        <FootballLeaderboard />
      </Sheet>
      {sheet === "guide" && <GuidePage onClose={close} />}

      {chatFull && (
        <ChatScreen
          messages={chat.messages}
          myId={session?.id}
          session={session}
          onSend={chat.send}
          onNeedLogin={() => {
            setChatFull(false);
            setSheet("login");
          }}
          onClose={closeChatFull}
        />
      )}

      <Sheet open={sheet === "personalize"} title="Personnalisation" onClose={close}>
        <div className="skins-head">
          <p className="sheet__text">Skins : tourne le carrousel, choisis un personnage, puis confirme.</p>
          <span className="skins-free">GRATUIT POUR LE MOMENT</span>
        </div>
        <div className="skins-picker" aria-label="Choisir un skin">
          <div className="skins-carousel-shell">
            <button
              type="button"
              className="skins-nav skins-nav--prev"
              onClick={() => rotateSkin(-1)}
              disabled={skinSaving}
              aria-label="Personnage precedent"
            >
              ‹
            </button>
            <div
              className="skins-carousel"
              style={{
                "--skin-count": SKINS.length,
                "--skin-index": activeSkinIndex,
              }}
            >
              <div className="skins-carousel__track">
                {SKINS.map((skin, index) => {
                  const isActive = activeSkin === skin.id;
                  const state = selectedSkin === skin.id
                    ? (isActive ? "Actif" : "Actuel")
                    : (isActive ? "Selectionne" : "Choisir");
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      className={`skin-card${isActive ? " is-active" : ""}`}
                      style={{ "--skin-position": index }}
                      aria-pressed={isActive}
                      disabled={skinSaving}
                      onClick={() => setDraftSkin(skin.id)}
                    >
                      <span className="skin-card__glow" aria-hidden="true" />
                      <span className="skin-card__icon"><IconUserPlus size={24} /></span>
                      <span className="skin-card__name">{skin.name}</span>
                      <span className="skin-card__move">{skin.movement}</span>
                      <span className="skin-card__status">{state}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              className="skins-nav skins-nav--next"
              onClick={() => rotateSkin(1)}
              disabled={skinSaving}
              aria-label="Personnage suivant"
            >
              ›
            </button>
          </div>
          <div className="skins-caption">
            <strong>{SKINS[activeSkinIndex]?.name || "Skin"}</strong>
            <small>{SKINS[activeSkinIndex]?.movement || "Animation"}</small>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block skins-confirm"
            onClick={confirmSkin}
            disabled={skinSaving}
          >
            {skinSaving
              ? "Enregistrement..."
              : draftSkin && draftSkin !== selectedSkin
                ? "Confirmer ce personnage"
                : "Garder ce personnage"}
          </button>
        </div>
        {skinError && <p className="sheet__error" role="alert">{skinError}</p>}
        <p className="skins-footnote">
          Le profil utilise un seul mouvement par personnage : marche, defile, danse, balayage ou pose statique.
          {session ? " Ton choix est conserve dans ton compte." : " Sans connexion, ton choix reste sur cet appareil."}
          {" "}Le Studio 3D permet de tester plus de mouvements quand ils existent.
        </p>
      </Sheet>

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
      <Sheet open={sheet === "owner-commissions"} title="Mes commissions" onClose={close}>
        {session?.pseudo === '999' && <OwnerCommissionSummary key={session.id} />}
      </Sheet>
      <Sheet open={sheet === "history"} title="Historique" onClose={close}>
        {session && <AccountHistory key={session.id} />}
      </Sheet>
      <Sheet open={sheet === "withdrawal"} title="Retrait" onClose={close}>
        {session && <WithdrawalForm key={session.id} user={session} onUser={updateUser} onRecharge={() => setSheet("recharge")} />}
      </Sheet>
      <Sheet open={sheet === "recharge"} title="Recharger" onClose={close}>
        {session && <RechargeForm user={session} onUser={updateUser} />}
      </Sheet>
    </>
  );
}
