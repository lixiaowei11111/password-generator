import { View, Text, Button, Input, Radio } from '@tarojs/components'
import { useLoad, showToast, setClipboardData } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useCallback, useEffect } from 'react'
import './index.scss'

type PasswordLength = 8 | 16 | 32 | 64 | 128

// 类型定义增强
interface OptionsType {
  length: PasswordLength
  charTypes: ('upper' | 'lower' | 'digits' | 'symbols')[]
}

// 常量集中管理
const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}

const LENGTH_OPTIONS = [8, 16, 32, 64, 128]
const CHAR_TYPE_OPTIONS = [
  { value: 'upper', label: '大写字母' },
  { value: 'lower', label: '小写字母' },
  { value: 'digits', label: '数字' },
  { value: 'symbols', label: '符号' }
]

// 密码强度描述映射
const STRENGTH_LEVELS = {
  0: { text: '无', class: '' },
  1: { text: '非常弱', class: 'strength-very-low' },
  2: { text: '弱', class: 'strength-low' },
  3: { text: '中等', class: 'strength-medium' },
  4: { text: '强', class: 'strength-high' },
  5: { text: '非常强', class: 'strength-very-high' }
}

// 初始化
const initialOptions: OptionsType = {
  length: 16,
  charTypes: ['upper', 'lower', 'digits', 'symbols']
}

export default function Index() {
  const [options, setOptions] = useState<OptionsType>(initialOptions)
  const [password, setPassword] = useState('')
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [strengthLevel, setStrengthLevel] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [userEdited, setUserEdited] = useState(false)

  useLoad(() => {
    console.log('Page loaded.')
  })

  // 安全随机数生成
  const generateSecureRandom = useCallback(async (max: number): Promise<number> => {
    try {
      const res = await Taro.getRandomValues({
        length: 4 // 使用4字节(32位)整数
      })
      const array = new Uint32Array(res.randomValues)
      return array[0] % max
    } catch (error) {
      console.error('生成随机数失败:', error)
      // 降级使用Math.random
      return Math.floor(Math.random() * max)
    }
  }, [])

  // 密码生成逻辑
  const generatePassword = useCallback(async () => {
    setIsGenerating(true)
    setUserEdited(false)

    let charset = ''
    options.charTypes.forEach(type => {
      charset += CHAR_SETS[type]
    })

    if (!charset) {
      showToast({ title: '请至少选择一种字符类型', icon: 'none' })
      setIsGenerating(false)
      return
    }

    try {
      let result = ''
      for (let i = 0; i < options.length; i++) {
        const randomIndex = await generateSecureRandom(charset.length)
        result += charset[randomIndex]
      }
      setPassword(result)

      // 计算密码强度
      const strength = calculateStrength(result)
      setPasswordStrength(strength)
      updateStrengthLevel(strength)
    } catch (error) {
      showToast({ title: '生成密码失败', icon: 'none' })
    } finally {
      setIsGenerating(false)
    }
  }, [options, generateSecureRandom])

  // 字符类型选择
  const handleCharTypeChange = (type: string, checked: boolean) => {
    setOptions(prev => {
      const newCharTypes = checked
        ? [...prev.charTypes, type as keyof typeof CHAR_SETS]
        : prev.charTypes.filter(t => t !== type)

      return {
        ...prev,
        charTypes: newCharTypes
      }
    })
  }

  // 更新密码强度等级
  const updateStrengthLevel = (strength: number) => {
    if (strength === 0) {
      setStrengthLevel(0)
    } else if (strength < 30) {
      setStrengthLevel(1) // 非常弱
    } else if (strength < 50) {
      setStrengthLevel(2) // 弱
    } else if (strength < 70) {
      setStrengthLevel(3) // 中等
    } else if (strength < 90) {
      setStrengthLevel(4) // 强
    } else {
      setStrengthLevel(5) // 非常强
    }
  }

  // 密码强度计算
  const calculateStrength = useCallback((pwd: string) => {
    if (!pwd) return 0

    let score = 0
    // 检查长度
    if (pwd.length >= 8) score += 10
    if (pwd.length >= 16) score += 15
    if (pwd.length >= 32) score += 25

    // 检查字符类型
    if (/[A-Z]/.test(pwd)) score += 20
    if (/[a-z]/.test(pwd)) score += 20
    if (/[0-9]/.test(pwd)) score += 20
    if (/[^A-Za-z0-9]/.test(pwd)) score += 25

    return Math.min(score, 100)
  }, [])

  // 监听密码变化，计算强度
  useEffect(() => {
    if (userEdited && password) {
      const strength = calculateStrength(password)
      setPasswordStrength(strength)
      updateStrengthLevel(strength)
    } else if (!password) {
      setPasswordStrength(0)
      setStrengthLevel(0)
    }
  }, [password, userEdited, calculateStrength])

  // 处理密码输入框变化
  const handlePasswordChange = (e) => {
    setPassword(e.detail.value)
    setUserEdited(true)
  }

  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await setClipboardData({ data: password })
      showToast({ title: '已复制到剪贴板', icon: 'success' })
    } catch (error) {
      showToast({ title: '复制失败', icon: 'none' })
    }
  }

  // 获取密码强度等级样式
  const getStrengthClass = () => {
    return STRENGTH_LEVELS[strengthLevel].class
  }

  return (
    <View className='password-generator'>
      <Text className="title">密码管理工具</Text>

      <View className="password-area">
        <Input
          value={password}
          disabled={isGenerating}
          placeholder="点击生成或输入密码"
          className="password-input"
          onInput={handlePasswordChange}
        />
        <Button
          className="copy-btn"
          size="mini"
          onClick={copyToClipboard}
          disabled={!password}
        >
          复制
        </Button>
      </View>

      {userEdited && password && (
        <View className="strength-indicator">
          <View className="strength-header">
            <Text className="strength-text">密码强度:</Text>
            <Text className={`strength-level ${getStrengthClass()}`}>
              {STRENGTH_LEVELS[strengthLevel].text}
            </Text>
          </View>
          <View className="strength-bar-container">
            <View
              className={`strength-bar ${getStrengthClass()}`}
              style={{ width: `${passwordStrength}%` }}
            />
          </View>
        </View>
      )}

      <View className="option-card">
        <Text className="card-title">密码设置</Text>

        <View className="option-row">
          <Text className="option-label">密码长度:</Text>
          <View className="option-values">
            {LENGTH_OPTIONS.map((length) => (
              <View className="option-value" key={length}>
                <Radio
                  value={length.toString()}
                  checked={options.length === length}
                  onClick={() => setOptions(prev => ({ ...prev, length: length as PasswordLength }))}
                  color="#1989fa"
                />
                <Text>{length}</Text>
              </View>
            ))}
          </View>
        </View>

        {CHAR_TYPE_OPTIONS.map(({ value, label }) => (
          <View className="option-row" key={value}>
            <Text className="option-label">{label}:</Text>
            <View className="option-values">
              <View className="option-value">
                <Radio
                  value="yes"
                  checked={options.charTypes.includes(value as any)}
                  onClick={() => handleCharTypeChange(value, true)}
                  color="#1989fa"
                />
                <Text>是</Text>
              </View>
              <View className="option-value">
                <Radio
                  value="no"
                  checked={!options.charTypes.includes(value as any)}
                  onClick={() => handleCharTypeChange(value, false)}
                  color="#1989fa"
                />
                <Text>否</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <Button
        type="primary"
        onClick={generatePassword}
        className="generate-btn"
        loading={isGenerating}
        disabled={isGenerating}
      >
        {isGenerating ? '生成中...' : '生成密码'}
      </Button>

      <View className='privacy-declaration'>
        <Text className='declaration-text'>
          隐私声明: 本工具基于本地运算生成密码，不会上传任何数据到服务器。
        </Text>
      </View>
    </View>
  )
}
