import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import FluidAnimation from "react-fluid-animation";
import Image from "next/image";

const Home: NextPage = () => {
  return (
    <div style={{ height: "100vh" }}>
      <FluidAnimation />
      <div className={styles.container}>
        <div className={styles.sideBar}>
          <div className={styles.logoContainer}>
            <span className={styles.center}>
              <div className={styles.logoimage}>
                <Image src="/jordan2.svg" alt="Logo" width={150} height={150} />
              </div>
            </span>
            <div className={styles.name}>Jordan </div>
            <div className={styles.name2}>Web Developer</div>
          </div>
          <button type="button" className={styles.block}>
            About me
          </button>
          <button type="button" className={styles.block}>
            Skills
          </button>
          <button type="button" className={styles.block}>
            Projects
          </button>
          <button type="button" className={styles.block}>
            Contact me
          </button>
        </div>
        <main className={styles.main}>
          <div className={styles.mainhello}>
            <div className={styles.mainhello1}>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>I</h1>
              <h1 className={styles.title}>'</h1>
              <h1 className={styles.title}>m</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>J</h1>
              <h1 className={styles.title}>o</h1>
              <h1 className={styles.title}>r</h1>
              <h1 className={styles.title}>d</h1>
              <h1 className={styles.title}>a</h1>
              <h1 className={styles.title}>n</h1>
              <br></br>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>E</h1>
              <h1 className={styles.title}>n</h1>
              <h1 className={styles.title}>g</h1>
              <h1 className={styles.title}>i</h1>
              <h1 className={styles.title}>n</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>r</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>t</h1>
              <h1 className={styles.title}>u</h1>
              <h1 className={styles.title}>r</h1>
              <h1 className={styles.title}>n</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>d</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>.</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>.</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>.</h1>
              <br></br>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>W</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>b</h1>
              <h1 className={styles.title}> </h1>
              <h1 className={styles.title}>D</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>v</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>l</h1>
              <h1 className={styles.title}>o</h1>
              <h1 className={styles.title}>p</h1>
              <h1 className={styles.title}>e</h1>
              <h1 className={styles.title}>r</h1>
            </div>
          </div>
          <div className={styles.sideBottom}>
            <div>
              <h1 className={styles.skills}>Skills</h1>
            </div>
            <div>
              <h1 className={styles.skills}>WJames is dope</h1>
            </div>
          </div>

          <div className={styles.sideBottom1}>
            <div>
              <h1 className={styles.skills}>Projects</h1>
            </div>
          </div>

          <div className={styles.logoimage}>
            <Image src="/logo.svg" alt="Vercel Logo" width={200} height={200} />
          </div>
          <div className={styles.logoimage}>
            <Image src="/logo.svg" alt="Vercel Logo" width={200} height={200} />
          </div>
          <div className={styles.logoimage}>
            <Image src="/logo.svg" alt="Vercel Logo" width={200} height={200} />
          </div>
          <div className={styles.logoimage}>
            <Image src="/logo.svg" alt="Vercel Logo" width={200} height={200} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;
