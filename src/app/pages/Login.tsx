'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Track from '../components/Track';
import Train from '../components/Train';
import { useLocomotive, useCar } from '../hooks/useTrainData';

export default function Login() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { locomotive, loading: locoLoading, error: locoError } = useLocomotive(5); // HXD1 has ID 5
  const { car, loading: carLoading, error: carError } = useCar(1); // Hard Seat car

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
    if (message) setMessage('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('邮箱和密码不能为空');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为6位');
      return false;
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { success, error: signUpError, message: signUpMessage } = await signUpWithEmail(
          formData.email, 
          formData.password
        );
        
        if (success) {
          setMessage(signUpMessage || '注册成功！');
          // Switch to sign in mode after successful signup
          setTimeout(() => {
            setIsSignUp(false);
            setFormData({
              email: formData.email,
              password: '',
              confirmPassword: ''
            });
          }, 2000);
        } else {
          setError(signUpError || '注册失败');
        }
      } else {
        const { success, error: signInError } = await signInWithEmail(
          formData.email, 
          formData.password
        );
        
        if (!success) {
          setError(signInError || '登录失败');
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
  };

  // Create a train consist with locomotive and cars
  const trainConsist = [];
  if (locomotive) trainConsist.push(locomotive);
  if (car) trainConsist.push(car);
  if (car) trainConsist.push(car);
  if (car) trainConsist.push(car);
  
  const handleTrainItemClick = (item: any, index: number) => {
    console.log(`Clicked ${item.en_name} at position ${index}`);
  };

  return (
    <div className='overflow-hidden h-screen w-screen'>
      <div className="min-h-screen bg-black flex flex-col items-center pt-20 p-4 z-100">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-light text-white mb-2 tracking-wide">
            铁道帝国
          </h1>
          <h2 className="text-xl font-light text-white/80 tracking-widest">
            Iron Empire
          </h2>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md backdrop-blur-sm rounded-lg p-6 mb-8">

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                placeholder="邮箱地址"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all"
              />
            </div>
            
            <div>
              <input
                type="password"
                name="password"
                placeholder="密码"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all"
              />
            </div>

            {isSignUp && (
              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="确认密码"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:border-white/60 focus:bg-white/30 transition-all"
                />
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-400/20 py-2 px-3 rounded">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-400 text-sm text-center bg-green-400/20 py-2 px-3 rounded">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                <span>{isSignUp ? '注册' : '登录'}</span>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={toggleMode}
              className="text-white/60 hover:text-white transition-colors text-sm"
            >
              {isSignUp ? '已有账户？点击登录' : '没有账户？点击注册'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Track with Train (moving effect) */}
      <Track 
        className="bottom-100"
        isMoving={true}
        speed={120}
        train={
          (locoLoading || carLoading) ? (
            <div className="text-white">火车模型正在加载中...</div>
          ) : (locoError || carError) ? (
            <div className="text-red-500">火车模型加载失败</div>
          ) : trainConsist.length > 0 ? (
            <Train 
              consists={trainConsist}
              scale={1}
              onClick={handleTrainItemClick}
              hoverable={false}
            />
          ) : null
        }
      />
    </div>
  );
} 