import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';
import Container from '../../components/Container/Container';
import MerchantChargeDemo from '../../components/MerchantCharge/MerchantCharge';
import styles from './MerchantCharge.module.scss';

export default function MerchantChargePage() {
    try {
        return (
            <>
                <Header></Header>
                <Container className={styles.container}>
                    <MerchantChargeDemo></MerchantChargeDemo>
                    <Footer></Footer>
                </Container>
            </>
        );
    } catch (error) {
        console.error('MerchantChargePage error:', error);
        return (
            <>
                <Header></Header>
                <Container className={styles.container}>
                    <div style={{ padding: '20px', color: 'red' }}>
                        组件加载错误: {error instanceof Error ? error.message : String(error)}
                    </div>
                </Container>
                <Footer></Footer>
            </>
        );
    }
}
